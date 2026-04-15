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

    message: { type: String, default: "" },

    fileUrl: { type: String, default: null },
    fileType: { type: String, default: null },

    isForwarded: { type: Boolean, default: false },

    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date, default: null },

    isSeen: { type: Boolean, default: false },
    seenAt: { type: Date, default: null },

    createdAt: { type: Date, default: Date.now },
    lastSeen: { type: Date },
    isOnline: { type: Boolean, default: false },

    reactions: [reactionSchema],

    // ✅ NEW FIELDS
    isDeleted: { type: Boolean, default: false },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("messages", MessageSchema);

