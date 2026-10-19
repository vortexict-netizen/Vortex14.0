import mongoose from "mongoose";

const purchasedEventSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    eventId: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const eventRegistrationSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    rollNumber: {
      type: String,
      required: true,
      trim: true,
    },

    academicYear: {
      type: String,
      required: true,
    },

    branch: {
      type: String,
      default: "",
      trim: true,
    },

    events: {
      type: [purchasedEventSchema],
      required: true,
      validate: {
        validator: (events) => events.length > 0,
        message: "At least one event is required.",
      },
    },

    billing: {
      subtotal: { type: Number, required: true, min: 0 },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },
      discount: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 },
    },

    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    purchaseConfirmation: {
      type: Boolean,
      default: false,
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const EventRegistration = mongoose.model(
  "EventRegistration",
  eventRegistrationSchema,
);

export default EventRegistration;
