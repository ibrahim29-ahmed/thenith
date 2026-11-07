import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    customerService: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerService",
      required: true,
      index: true,
    },
    senderModel: {
      type: String,
      enum: ["Admin", "User", "Guest", "System"],
      required: true,
    },
    senderId: {
      type: String, // String to accommodate both ObjectId and guestId
      required: true,
    },
    senderName: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

export default ChatMessage;
