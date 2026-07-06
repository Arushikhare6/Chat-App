import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage ,getSmartReplies ,markMessagesAsRead, } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/smart-replies/:id", protectRoute, getSmartReplies);
router.get("/:id", protectRoute, getMessages);
router.patch("/read/:id", protectRoute, markMessagesAsRead);
router.post("/send/:id", protectRoute, sendMessage);

export default router;