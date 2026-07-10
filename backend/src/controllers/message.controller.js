import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { generateSmartReplies } from "../lib/smartReplies.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } })
      .select("-password")
      .lean();

    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiverId: loggedInUserId,
          isRead: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadCountByUserId = new Map(
      unreadCounts.map((item) => [item._id.toString(), item.count])
    );

    const usersWithUnreadCounts = filteredUsers.map((user) => ({
      ...user,
      unreadCount: unreadCountByUserId.get(user._id.toString()) || 0,
    }));

    res.status(200).json(usersWithUnreadCounts);
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
    }).populate("replyTo")
    .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, file, replyTo } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image, {
        resource_type: "image",
      });
      imageUrl = uploadResponse.secure_url;
    }

    let fileData;
    if (file?.dataUrl) {
      const uploadResponse = await cloudinary.uploader.upload(file.dataUrl, {
        resource_type: "auto",
      });

      fileData = {
        url: uploadResponse.secure_url,
        name: file.name,
        type: file.type,
        size: file.size,
        resourceType: uploadResponse.resource_type,
      };
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      file: fileData,
      replyTo: replyTo || null,
    });

    await newMessage.save();
    await newMessage.populate("replyTo");

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

export const markMessagesAsRead = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: otherUserId } = req.params;

    // Mark unread messages as read
    await Message.updateMany(
      {
        senderId: otherUserId,
        receiverId: myId,
        isRead: { $ne: true },
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    // Notify sender (if online)
    const senderSocketId = getReceiverSocketId(otherUserId);

    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", {
        readerId: myId,
      });
    }

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.log("Error in markMessagesAsRead:", error.message);

    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// -------------------- Message Reactions --------------------

export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    // Find the message
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        error: "Message not found",
      });
    }

    // Check if this user has already reacted
    const existingReaction = message.reactions.find(
      (reaction) => reaction.userId.toString() === userId.toString()
    );

    if (existingReaction) {
      // Replace previous reaction
      existingReaction.emoji = emoji;
    } else {
      // Add new reaction
      message.reactions.push({
        userId,
        emoji,
      });
    }

    await message.save();

    // Notify sender and receiver instantly
    const senderSocketId = getReceiverSocketId(message.senderId.toString());
    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());

    if (senderSocketId) {
      io.to(senderSocketId).emit("messageReaction", message);
    }

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageReaction", message);
    }

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in reactToMessage:", error.message);

    res.status(500).json({
      error: "Internal server error",
    });
  }
};
