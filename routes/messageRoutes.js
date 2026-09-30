import express from "express";
import Message from "../models/Messages.js";

const router = express.Router();

// Get conversation between two users
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentUserId } = req.query;

    const messages = await Message.find({
      $or: [
        {
          sender: currentUserId,
          receiver: userId,
        },
        {
          sender: userId,
          receiver: currentUserId,
        },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch messages",
    });
  }
});

// Send message
router.post("/", async (req, res) => {
  try {
    const { sender, receiver, content } = req.body;

    if (!sender || !receiver || !content) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const message = await Message.create({
      sender,
      receiver,
      content,
    });

    res.status(201).json(message);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to send message",
    });
  }
});

export default router;