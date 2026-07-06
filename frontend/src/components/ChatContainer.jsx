import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";
import { Check,CheckCheck, Smile } from "lucide-react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const TypingBubble = ({ avatarSrc }) => (
  <div className="chat chat-start" data-testid="typing-indicator">
    <div className="chat-image avatar">
      <div className="size-10 rounded-full border">
        <img src={avatarSrc || "/avatar.png"} alt="profile pic" />
      </div>
    </div>

    <div className="chat-bubble flex items-center gap-1 py-3 min-h-0">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  </div>
);

const REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];
const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    typingUserId,
    markMessagesAsRead,
    reactToMessage,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const bottomRef = useRef(null);

  useEffect(() => {
  if (!selectedUser) return;

  getMessages(selectedUser._id);

  subscribeToMessages();

  return () => unsubscribeFromMessages();
}, [selectedUser, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
  bottomRef.current?.scrollIntoView({
    behavior: "smooth",
  });
   }, [messages.length]);

  useEffect(() => {
  if (!selectedUser) return;

  markMessagesAsRead();
  }, [selectedUser?._id]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  const isOtherUserTyping =
  selectedUser && typingUserId === selectedUser._id;

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${
              message.senderId === authUser._id ? "chat-end" : "chat-start"
            }`}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>

            <div className="chat-header mb-1 flex items-center gap-1">
            <time className="text-xs opacity-50 ml-1">
              {formatMessageTime(message.createdAt)}
            </time>

            {message.senderId === authUser._id &&
              (message.isRead ? (
                <CheckCheck
                  size={14}
                  className="text-sky-500"
                />
              ) : (
                <Check
                  size={14}
                  className="text-gray-400"
                />
              ))}
          </div>
          <div className="chat-bubble relative flex flex-col group">
            {message.image && (
              <img
                src={message.image}
                alt="Attachment"
                className="sm:max-w-[200px] rounded-md mb-2"
              />
            )}

            {message.text && <p>{message.text}</p>}

            {/* Hover Emoji Picker */}
            <div
              className="
                absolute
                -bottom-7
                right-0
                hidden
                group-hover:flex
                gap-1
                bg-base-200
                rounded-full
                px-2
                py-1
                shadow-lg
                z-10
              "
            >
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => reactToMessage(message._id, emoji)}
                  className="hover:scale-125 transition"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Existing reactions */}
            {message.reactions?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {message.reactions.map((reaction) => (
                  <span
                    key={reaction.userId}
                    className="text-sm bg-base-300 rounded-full px-2 py-0.5"
                  >
                    {reaction.emoji}
                  </span>
                ))}
              </div>
            )}
          </div>
            
          </div>
        ))}

        {isOtherUserTyping && (
          <TypingBubble avatarSrc={selectedUser?.profilePic} />
        )}

        <div ref={bottomRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;