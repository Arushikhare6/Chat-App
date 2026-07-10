import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null,
    },
    isRead: {
    type: Boolean,
    default: false,
    },
    readAt: {
    type: Date,
    default: null,
    },
    reactions: [
    {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    emoji: {
      type: String,
    },
  },
],
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;