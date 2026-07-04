import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Sparkles, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
const TYPING_STOP_DELAY_MS = 1500;

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
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
}, [selectedUser?._id]);
  
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
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    emitStopTyping();
    isTypingRef.current = false;
  }
};

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const stopTypingNow = () => {
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
  }

  if (isTypingRef.current) {
    emitStopTyping();
    isTypingRef.current = false;
  }
};

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      stopTypingNow();
      clearSmartReplies();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };
   
  const handleSuggestionClick = async (suggestion) => {
  try {
    await sendMessage({
      text: suggestion,
      image: null,
    });

    setText("");
    setImagePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    stopTypingNow();
    clearSmartReplies();
  } catch (error) {
    console.error("Failed to send suggestion:", error);
  }
};

  return (
    <div className="p-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
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
    disabled={isSmartRepliesLoading}
    className="btn btn-xs sm:btn-sm gap-1 rounded-full border border-primary/30
               bg-primary/10 text-primary hover:bg-primary/20"
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
      className="btn btn-xs sm:btn-sm rounded-full
                 bg-base-200 hover:bg-base-300
                 border border-base-300
                 normal-case font-normal
                 max-w-[240px] truncate"
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
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;