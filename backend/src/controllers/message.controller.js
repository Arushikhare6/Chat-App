import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { generateSmartReplies } from "../lib/smartReplies.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// -------------------- AI Smart Replies --------------------
// GET /api/messages/smart-replies/:id

export const getSmartReplies = async (req, res) => {
  try {
    const { id: otherUserId } = req.params;
    const myId = req.user._id;

    const recent = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: myId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    if (recent.length === 0) {
      return res.status(200).json({
        replies: ["Hey! 👋", "How are you?", "What's up?"],
        source: "default",
      });
    }

    const conversation = recent
      .reverse()
      .filter((m) => m.text && m.text.trim().length > 0)
      .map((m) => ({
        role: m.senderId.toString() === myId.toString() ? "me" : "them",
        text: m.text,
      }));

    if (conversation.length === 0) {
      return res.status(200).json({
        replies: ["Nice pic!", "Cool 👀", "Tell me more"],
        source: "default",
      });
    }

    const replies = await generateSmartReplies(conversation);

    return res.status(200).json({
      replies,
      source: "ai",
    });
  } catch (error) {
    console.log("Error in getSmartReplies controller: ", error.message);

    return res.status(200).json({
      replies: [
        "Got it 👍",
        "Interesting, tell me more",
        "Sounds good!",
      ],
      source: "fallback",
      error: error.message,
    });
  }
};