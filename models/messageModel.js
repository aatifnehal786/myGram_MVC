// models/Message.js (or wherever your schema is)
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  message: { type: String },   // removed `required: true`
  fileUrl: { type: String },
  fileType: { type: String },
  isForwarded: {
  type: Boolean,
  default: false
}
,
  createdAt: { type: Date, default: Date.now}
},{timestamps:true});



const Message =  mongoose.model('messages', MessageSchema);

export default Message;
