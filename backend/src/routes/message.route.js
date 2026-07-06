import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  getUsersForSidebar,
  sendMessage,
  getSmartReplies,
  markMessagesAsRead,
  reactToMessage,
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/smart-replies/:id", protectRoute, getSmartReplies);
router.get("/:id", protectRoute, getMessages);
router.patch("/read/:id", protectRoute, markMessagesAsRead);
router.patch("/reaction/:messageId", protectRoute, reactToMessage);
router.post("/send/:id", protectRoute, sendMessage);

export default router;