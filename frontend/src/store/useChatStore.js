import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  // Typing indicator
  typingUserId: null,

  // AI Smart Replies
  smartReplies: [],
  isSmartRepliesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();

    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );

      set({
        messages: [...messages, res.data],
        smartReplies: [],
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },
   
    reactToMessage: async (messageId, emoji) => {
  try {
    const res = await axiosInstance.patch(
      `/messages/reaction/${messageId}`,
      { emoji }
    );

    set({
      messages: get().messages.map((message) =>
        message._id === messageId ? res.data : message
      ),
    });
  } catch (error) {
    toast.error("Couldn't react to message");
  }
},

    markMessagesAsRead: async () => {
    const { selectedUser, messages } = get();

    if (!selectedUser) return;

    const unreadMessages = messages.filter(
    (message) =>
      message.senderId === selectedUser._id &&
      !message.isRead
   );

  if (unreadMessages.length === 0) return;

    try {
      await axiosInstance.patch(
        `/messages/read/${selectedUser._id}`
      );

      set({
        messages: messages.map((message) =>
          message.senderId === selectedUser._id
            ? {
                ...message,
                isRead: true,
                readAt: new Date().toISOString(),
              }
            : message
        ),
      });
    } catch (error) {
      console.error(error);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser =
        newMessage.senderId === selectedUser._id;

      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
        smartReplies: [],
      });
      get().markMessagesAsRead();
    });

        socket.on("messagesRead", () => {
        const { selectedUser } = get();

        set({
          messages: get().messages.map((message) =>
            message.receiverId === selectedUser._id
              ? {
                  ...message,
                  isRead: true,
                  readAt: new Date().toISOString(),
                }
              : message
          ),
        });
      });

    socket.on("messageReaction", (updatedMessage) => {
      set({
          messages: get().messages.map((message) =>
            message._id === updatedMessage._id
              ? updatedMessage
              : message
          ),
        });
    });

    socket.on("userTyping", ({ senderId }) => {
      if (senderId === selectedUser._id) {
        set({ typingUserId: senderId });
      }
    });

    socket.on("userStopTyping", ({ senderId }) => {
      if (senderId === selectedUser._id) {
        set({ typingUserId: null });
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messagesRead");
    socket.off("messageReaction");
    socket.off("userTyping");
    socket.off("userStopTyping");

    set({
      typingUserId: null,
    });
  },

  emitTyping: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;

    if (!socket || !selectedUser) return;

    socket.emit("typing", {
      receiverId: selectedUser._id,
    });
  },

  emitStopTyping: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;

    if (!socket || !selectedUser) return;

    socket.emit("stopTyping", {
      receiverId: selectedUser._id,
    });
  },

  fetchSmartReplies: async () => {
    const { selectedUser } = get();

    if (!selectedUser) return;

    set({
      isSmartRepliesLoading: true,
    });

    try {
      const res = await axiosInstance.get(
        `/messages/smart-replies/${selectedUser._id}`
      );

      set({
        smartReplies: res.data.replies || [],
      });
    } catch (error) {
      toast.error("Couldn't get smart replies");

      set({
        smartReplies: [],
      });
    } finally {
      set({
        isSmartRepliesLoading: false,
      });
    }
  },

  clearSmartReplies: () => {
    set({
      smartReplies: [],
    });
  },

  setSelectedUser: (selectedUser) =>
    set({
      selectedUser,
      typingUserId: null,
      smartReplies: [],
    }),
}));