import Post from '../models/postModel.js'

export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().populate("postedBy", "username profilePic").populate("comments.commentedBy", "username profilePic").sort({ createdAt: -1 });
    res.json(posts);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getPublicPosts = async (req, res) => {
  try {
    const posts = await Post.find().populate("postedBy", "username profilePic").populate("comments.commentedBy", "username profilePic").sort({ createdAt: -1 }).limit(20);
    res.json(posts);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const likePost = async (req, res) => {
  const post = await Post.findByIdAndUpdate(req.params.postid, { $addToSet: { likes: req.user._id } }, { new: true });
  res.json(post);
};

export const unlikePost = async (req, res) => {
  const post = await Post.findByIdAndUpdate(req.params.postid, { $pull: { likes: req.user._id } }, { new: true });
  res.json(post);
};

export const commentPost = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment text required" });

    const postId = req.params.postid || req.params.postId;

    const post = await Post.findByIdAndUpdate(
      postId,
      { $push: { comments: { text: text.trim(), commentedBy: req.user._id } } },
      { new: true }
    ).populate("comments.commentedBy", "username profilePic");

    if (!post) return res.status(404).json({ message: "Post not found" });

    res.json(post);
  } catch (err) {
    console.error("commentPost error:", err);
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

    // Only owner can delete
    if (comment.commentedBy.toString()!== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own comment" });
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
  await Post.findByIdAndDelete(req.params.id);
  res.json({ message: "Post deleted" });
};