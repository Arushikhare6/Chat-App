import { useEffect, useRef } from "react";
import { Check, CheckCheck, Download, FileText, Reply } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";

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

const REACTIONS = [
  "\u2764\uFE0F",
  "\uD83D\uDC4D",
  "\uD83D\uDE02",
  "\uD83D\uDE2E",
  "\uD83D\uDE22",
  "\uD83D\uDD25",
];

const formatFileSize = (size) => {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getMessagePreview = (message) => {
  if (message.text) return message.text;
  if (message.file?.name) return message.file.name;
  if (message.image) return "Image";
  return "Attachment";
};

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    typingUserId,
    markMessagesAsRead,
    reactToMessage,
    setReplyingTo,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!selectedUser) return;

    getMessages(selectedUser._id);
  }, [selectedUser, getMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages.length]);

  useEffect(() => {
    if (!selectedUser) return;

    markMessagesAsRead();
  }, [selectedUser?._id, markMessagesAsRead]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  const isOtherUserTyping = selectedUser && typingUserId === selectedUser._id;

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
                  <CheckCheck size={14} className="text-sky-500" />
                ) : (
                  <Check size={14} className="text-gray-400" />
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

              {message.file?.url && (
                <a
                  href={message.file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-2 flex items-center gap-2 rounded-lg bg-base-300 p-3 hover:bg-base-200 transition-colors"
                >
                  <FileText className="size-5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">
                      {message.file.name || "Download file"}
                    </span>
                    <span className="block text-xs opacity-60">
                      {formatFileSize(message.file.size)}
                    </span>
                  </span>
                  <Download className="size-4 shrink-0" />
                </a>
              )}

              {message.replyTo && (
                <div className="mb-2 p-2 rounded bg-base-300 border-l-4 border-primary">
                  <p className="text-xs text-primary font-semibold">Replying to</p>
                  <p className="text-xs opacity-70 truncate">
                    {getMessagePreview(message.replyTo)}
                  </p>
                </div>
              )}

              {message.text && <p>{message.text}</p>}

              <div className="absolute -bottom-7 right-0 hidden group-hover:flex gap-1 bg-base-200 rounded-full px-2 py-1 shadow-lg z-10">
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

              <div className="flex justify-end mt-2">
                <button
                  onClick={() => setReplyingTo(message)}
                  className="btn btn-ghost btn-xs"
                >
                  <Reply size={14} />
                </button>
              </div>
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
