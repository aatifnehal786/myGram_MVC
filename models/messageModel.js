import mongoose from "mongoose";
import { encrypt, decrypt } from "../utils/encryption.js";

const reactionSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: "users" }, emoji: String }, { _id: false });

const MessageSchema = new mongoose.Schema({
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
    reactions: [reactionSchema],
    isDeleted: { type: Boolean, default: false },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  }, { timestamps: true }
);

MessageSchema.pre("save", function(next) {
  if(this.isModified("message") && this.message) {
    this.message = encrypt(this.message);
  }
  next();
});

const decryptMsg = (doc) => { if(doc?.message) doc.message = decrypt(doc.message); };
MessageSchema.post(/^find/, function(docs) {
  if(Array.isArray(docs)) docs.forEach(decryptMsg);
  else decryptMsg(docs);
});

const Message = mongoose.model("messages", MessageSchema);
export default Message;