import mongoose from "mongoose";


const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    emoji: { type: String },
  },
  { _id: false }
);
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
    seenAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now},
    lastSeen: { type: Date },
    isOnline: {type:Boolean, default:false},
    reactions: [reactionSchema],


  },
  { timestamps: true }
);

export default mongoose.model("messages", MessageSchema);

