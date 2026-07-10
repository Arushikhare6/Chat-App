import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Send, Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";
import { useChatStore } from "../store/useChatStore";

const TYPING_STOP_DELAY_MS = 1500;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const formatFileSize = (size) => {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getReplyPreview = (message) => {
  if (message.text) return message.text;
  if (message.file?.name) return message.file.name;
  if (message.image) return "Image";
  return "Attachment";
};

const MessageInput = () => {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const {
    sendMessage,
    emitTyping,
    emitStopTyping,
    smartReplies,
    isSmartRepliesLoading,
    fetchSmartReplies,
    clearSmartReplies,
    selectedUser,
    replyingTo,
    clearReplyingTo,
  } = useChatStore();

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (isTypingRef.current) {
        emitStopTyping();
        isTypingRef.current = false;
      }
    };
  }, [selectedUser?._id, emitStopTyping]);

  const stopTypingNow = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTypingRef.current) {
      emitStopTyping();
      isTypingRef.current = false;
    }
  };

  const handleTextChange = (e) => {
    const value = e.target.value;
    setText(value);

    if (value.length > 0) {
      if (!isTypingRef.current) {
        emitTyping();
        isTypingRef.current = true;
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        emitStopTyping();
        isTypingRef.current = false;
      }, TYPING_STOP_DELAY_MS);
    } else if (isTypingRef.current) {
      stopTypingNow();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE) {
      toast.error("File must be 10 MB or smaller");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachment({
        dataUrl: reader.result,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        isImage: file.type.startsWith("image/"),
      });
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearForm = () => {
    setText("");
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    stopTypingNow();
    clearSmartReplies();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (isSending || (!text.trim() && !attachment)) return;

    try {
      setIsSending(true);
      await sendMessage({
        text: text.trim(),
        image: attachment?.isImage ? attachment.dataUrl : null,
        file:
          attachment && !attachment.isImage
            ? {
                dataUrl: attachment.dataUrl,
                name: attachment.name,
                type: attachment.type,
                size: attachment.size,
              }
            : null,
        replyTo: replyingTo?._id || null,
      });

      clearForm();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSuggestionClick = async (suggestion) => {
    if (isSending) return;

    try {
      setIsSending(true);
      await sendMessage({
        text: suggestion,
        image: null,
        file: null,
      });

      clearForm();
    } catch (error) {
      console.error("Failed to send suggestion:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 w-full">
      {replyingTo && (
        <div className="mb-3 rounded-lg border-l-4 border-primary bg-base-200 p-3">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-primary">Replying to</p>
              <p className="text-sm truncate">{getReplyPreview(replyingTo)}</p>
            </div>

            <button
              type="button"
              onClick={clearReplyingTo}
              className="btn btn-xs btn-circle"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {attachment && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            {attachment.isImage ? (
              <img
                src={attachment.dataUrl}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
              />
            ) : (
              <div className="w-64 max-w-full rounded-lg border border-base-300 bg-base-200 p-3 pr-8">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                    <p className="text-xs opacity-60">{formatFileSize(attachment.size)}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={removeAttachment}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={fetchSmartReplies}
          disabled={isSmartRepliesLoading || isSending}
          className="btn btn-xs sm:btn-sm gap-1 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
        >
          {isSmartRepliesLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}

          <span>Suggest replies</span>
        </button>

        {smartReplies.map((reply, idx) => (
          <button
            key={`${idx}-${reply}`}
            type="button"
            onClick={() => handleSuggestionClick(reply)}
            disabled={isSending}
            className="btn btn-xs sm:btn-sm rounded-full bg-base-200 hover:bg-base-300 border border-base-300 normal-case font-normal max-w-[240px] truncate"
            title={reply}
          >
            {reply}
          </button>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={handleTextChange}
            onBlur={stopTypingNow}
            disabled={isSending}
          />

          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isSending}
          />

          <button
            type="button"
            className={`btn btn-circle ${
              attachment ? "text-emerald-500" : "text-zinc-400"
            }`}
            disabled={isSending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={20} />
          </button>
        </div>

        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={isSending || (!text.trim() && !attachment)}
        >
          {isSending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Send size={22} />
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
