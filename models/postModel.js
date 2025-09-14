import mongoose from "mongoose";
// import User from "./userModel";
const postSchema = new mongoose.Schema({
  caption: String,
  mediaUrl: String,
  mediaType: { type: String, enum: ['image', 'video'], required: true },
  backgroundMusic: String,
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
  comments: [{
    text: String,
    commentedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users' }
  }],
}, { timestamps: true });

const Post =  mongoose.model('posts', postSchema); // singular name 'Post'

export default Post
