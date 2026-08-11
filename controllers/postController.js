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
  const post = await Post.findByIdAndUpdate(req.params.postid, { $push: { comments: { text: req.body.text, commentedBy: req.user._id } } }, { new: true }).populate("comments.commentedBy", "username");
  res.json(post);
};

export const deletePost = async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.json({ message: "Post deleted" });
};