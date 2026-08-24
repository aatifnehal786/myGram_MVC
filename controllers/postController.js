import Post from '../models/postModel.js'




export const getAllPosts = async (req, res) => {
  try {
    // Add limit to avoid loading 10k posts at once
    const posts = await Post.find()
      .populate("postedBy", "username profilePic")
      .populate("comments.commentedBy", "username profilePic")
      .sort({ createdAt: -1 })
      .limit(100); // safety
    res.json(posts);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getPublicPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("postedBy", "username profilePic")
      .populate("comments.commentedBy", "username profilePic")
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(posts);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const likePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.postid, 
      { $addToSet: { likes: req.user._id } }, 
      { new: true }
    ).populate("postedBy", "username profilePic");
    if(!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const unlikePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.postid, 
      { $pull: { likes: req.user._id } }, 
      { new: true }
    ).populate("postedBy", "username profilePic");
    if(!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const commentPost = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment text required" });
    if (text.length > 300) return res.status(400).json({ message: "Comment too long" });

    const postId = req.params.postid || req.params.postId;
    const post = await Post.findByIdAndUpdate(
      postId,
      { $push: { comments: { text: text.trim(), commentedBy: req.user._id } } },
      { new: true }
    ).populate("comments.commentedBy", "username profilePic");

    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { postid, commentId } = req.params;
    const post = await Post.findById(postid);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // Owner of comment OR owner of post can delete
    if (comment.commentedBy.toString() !== req.user._id.toString() && 
        post.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    post.comments.pull(commentId);
    await post.save();
    const updated = await Post.findById(postid).populate("comments.commentedBy", "username profilePic");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if(!post) return res.status(404).json({ message: "Post not found" });
    
    // SECURITY FIX: Only owner can delete - you were missing this
    if(post.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own post" });
    }
    
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};