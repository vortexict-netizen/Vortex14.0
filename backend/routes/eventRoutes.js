import express from "express";
import Event from "../models/Event.js";

const router = express.Router();

// POST /api/events
router.post("/", async (req, res) => {
  try {
    const { eventId, name, price, description, category = "" } = req.body;

    // Validate required fields
    if (
      typeof eventId !== "string" ||
      !eventId.trim() ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof description !== "string" ||
      !description.trim() ||
      price === undefined ||
      price === null ||
      price === "" ||
      typeof price === "boolean" ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid eventId, name, price, and description are required.",
      });
    }

    // Check whether the event ID already exists
    const existingEvent = await Event.findOne({
      eventId: eventId.trim(),
    });

    if (existingEvent) {
      return res.status(409).json({
        success: false,
        message: "An event with this ID already exists.",
      });
    }

    // Create the event
    const event = await Event.create({
      eventId: eventId.trim(),
      name: name.trim(),
      price: Number(price),
      description: description.trim(),
      category: typeof category === "string" ? category.trim() : "",
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Event created successfully.",
      event,
    });
  } catch (error) {
    // Handle duplicate-key errors, including concurrent requests
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An event with this ID already exists.",
      });
    }

    console.error("Create event error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create event.",
    });
  }
});

export default router;
