import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },

    // Text message (optional because file messages exist)
    message: { type: String, default: "" },

    // File message support (image, video, audio, document)
    fileUrl: { type: String, default: null },
    fileType: { type: String, default: null },

    // Forward message
    isForwarded: { type: Boolean, default: false },

    // Delivery + Seen tracking
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date, default: null },

    isSeen: { type: Boolean, default: false },
    seenAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now},
    lastSeen: { type: Date }


  },
  { timestamps: true }
);

export default mongoose.model("messages", MessageSchema);

