import express from "express";
import Razorpay from "razorpay";
import Event from "../models/Event.js";
import EventRegistration from "../models/EventRegistration.js";
import crypto from "crypto";
import mongoose from "mongoose";

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/registrations/create-order
router.post("/create-order", async (req, res) => {
  try {
    const {
      name,
      email,
      rollNumber,
      academicYear,
      branch = "",
      events,
    } = req.body;

    // Validate request
    if (
      !name?.trim() ||
      !email?.trim() ||
      !rollNumber?.trim() ||
      !academicYear ||
      !Array.isArray(events) ||
      events.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Required registration details are missing.",
      });
    }

    // Extract event IDs
    const eventIds = events.map((event) => event?.id);

    if (
      eventIds.some((id) => typeof id !== "string" || !id.trim()) ||
      new Set(eventIds).size !== eventIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or duplicate event IDs.",
      });
    }

    // Fetch official events from MongoDB
    const dbEvents = await Event.find({
      eventId: { $in: eventIds },
      isActive: true,
    });

    if (dbEvents.length !== eventIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more events do not exist or are unavailable.",
      });
    }

    // Build purchase snapshot using database prices
    const purchasedEvents = eventIds.map((id) => {
      const event = dbEvents.find((item) => item.eventId === id);

      return {
        event: event._id,
        eventId: event.eventId,
        name: event.name,
        category: event.category || "",
        price: event.price,
      };
    });

    // Calculate billing on the server
    const subtotal = purchasedEvents.reduce(
      (sum, event) => sum + event.price,
      0,
    );

    const discountPercent = Number(
      process.env.REGISTRATION_DISCOUNT_PERCENT ?? 0,
    );

    if (
      !Number.isFinite(discountPercent) ||
      discountPercent < 0 ||
      discountPercent > 100
    ) {
      throw new Error("Invalid discount configuration.");
    }

    const discount = Math.round(subtotal * discountPercent) / 100;

    const total = Math.round((subtotal - discount) * 100) / 100;

    const amount = Math.round(total * 100);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order amount.",
      });
    }

    // Create Razorpay order (amount is in paise)
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `vtx_${Date.now()}`,
    });

    // Save one registration for the complete order
    const registration = await EventRegistration.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      rollNumber: rollNumber.trim(),
      academicYear,
      branch: typeof branch === "string" ? branch.trim() : "",

      events: purchasedEvents,

      billing: {
        subtotal,
        discountPercent,
        discount,
        total,
      },

      razorpayOrderId: order.id,
      razorpayPaymentId: null,
      paymentStatus: "pending",
      purchaseConfirmation: false,
      paidAt: null,
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully.",
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      registrationId: registration._id,
    });
  } catch (error) {
    console.error("Create order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create order.",
    });
  }
});

// POST /api/registrations/verify-payment
router.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // 1. Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay payment verification details.",
      });
    }

    // 2. Find the registration associated with this order
    const registration = await EventRegistration.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration for this order was not found.",
      });
    }

    // 3. Prevent duplicate confirmation
    if (registration.purchaseConfirmation === true) {
      if (registration.razorpayPaymentId === razorpay_payment_id) {
        return res.status(200).json({
          success: true,
          message: "Payment has already been verified.",
        });
      }

      return res.status(409).json({
        success: false,
        message: "This order has already been confirmed.",
      });
    }

    // 4. Generate the signature using the server-side secret
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // 5. Compare signatures safely

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature.",
      });
    }

    // 6. Verify the payment with Razorpay itself
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (
      payment.order_id !== razorpay_order_id ||
      payment.status !== "captured" ||
      payment.amount !== Math.round(registration.billing.total * 100) ||
      payment.currency !== "INR"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment is not captured or does not match this order.",
      });
    }

    // 7. Confirm the purchase
    const updatedRegistration = await EventRegistration.findOneAndUpdate(
      {
        _id: registration._id,
        purchaseConfirmation: false,
      },
      {
        $set: {
          razorpayPaymentId: razorpay_payment_id,
          paymentStatus: "paid",
          purchaseConfirmation: true,
          paidAt: new Date(),
        },
      },
      { new: true, runValidators: true },
    );

    if (!updatedRegistration) {
      // Another request may have confirmed this order concurrently.
      const current = await EventRegistration.findById(registration._id);

      if (
        current?.purchaseConfirmation === true &&
        current.razorpayPaymentId === razorpay_payment_id
      ) {
        return res.status(200).json({
          success: true,
          message: "Payment has already been verified.",
        });
      }

      return res.status(409).json({
        success: false,
        message: "Registration status changed. Please check the order.",
      });
    }

    // 8. Return confirmation to the frontend
    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      receipt: {
        registrationId: updatedRegistration._id.toString(),

        name: updatedRegistration.name,
        email: updatedRegistration.email,
        rollNumber: updatedRegistration.rollNumber,
        academicYear: updatedRegistration.academicYear,
        branch: updatedRegistration.branch,

        events: updatedRegistration.events.map((event) => ({
          eventId: event.eventId,
          name: event.name,
          category: event.category,
          price: event.price,
        })),

        billing: {
          subtotal: updatedRegistration.billing.subtotal,
          discountPercent: updatedRegistration.billing.discountPercent,
          discount: updatedRegistration.billing.discount,
          total: updatedRegistration.billing.total,
        },

        orderId: updatedRegistration.razorpayOrderId,
        paymentId: updatedRegistration.razorpayPaymentId,
        paidAt: updatedRegistration.paidAt
          ? new Date(updatedRegistration.paidAt).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })
          : null,
      },
    });
  } catch (error) {
    console.error("Payment verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment. Please check the order status.",
    });
  }
});

// GET /api/registrations/purchase/:purchaseId?email=student@example.com
router.get("/purchase/:purchaseId", async (req, res) => {
  try {
    console.log("hello world");
    const { purchaseId } = req.params;
    const email = String(req.query.email || "")
      .trim()
      .toLowerCase();

    if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Purchase ID.",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Registered email is required.",
      });
    }

    const registration = await EventRegistration.findOne({
      _id: purchaseId,
      email: email,
      paymentStatus: "paid",
      purchaseConfirmation: true,
    }).lean();

    if (!registration) {
      return res.status(404).json({
        success: false,
        message:
          "No confirmed purchase was found for that Purchase ID and email.",
      });
    }

    return res.status(200).json({
      success: true,
      registration: {
        registrationId: registration._id.toString(),
        name: registration.name,
        email: registration.email,
        rollNumber: registration.rollNumber,
        academicYear: registration.academicYear,
        branch: registration.branch,

        events: (registration.events || []).map((event) => ({
          eventId: event.eventId,
          name: event.name,
          category: event.category,
          price: event.price,
        })),

        billing: {
          subtotal: registration.billing?.subtotal ?? 0,
          discountPercent: registration.billing?.discountPercent ?? 0,
          discount: registration.billing?.discount ?? 0,
          total: registration.billing?.total ?? 0,
        },

        orderId: registration.razorpayOrderId,
        paymentId: registration.razorpayPaymentId,
        paymentStatus: registration.paymentStatus,
        paidAt: registration.paidAt,
      },
    });
  } catch (error) {
    console.error("Purchase lookup error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve the registration right now.",
    });
  }
});

export default router;
