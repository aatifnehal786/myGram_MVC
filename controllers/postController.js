import Post from '../models/postModel.js'

// Fetch posts
const getAllPosts = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const posts = await Post.find()
      .populate("postedBy", "_id username")
      .populate("comments.commentedBy", "_id username")
      .sort("-createdAt");
    res.status(200).json(posts);
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

// Like post
const likePost = async (req, res) => {
  const userId = req.user._id;
  const { postid } = req.params;
  const post = await Post.findByIdAndUpdate(
    postid,
    { $addToSet: { likes: userId } },
    { new: true }
  );
  res.json(post);
};

// Unlike post
const unlikePost = async (req, res) => {
   const userId = req.user._id;
  const { postid } = req.params;
  const post = await Post.findByIdAndUpdate(
    postid,
    { $pull: { likes: userId } },
    { newconst 
    })
  res.json(post)
 
}

// Comment
const commentPost = async (req, res) => {
  const userId = req.user._id;
  const { postid } = req.params;
  const { text } = req.body;

  const post = await Post.findByIdAndUpdate(
    postid,
    { $push: { comments: { text, commentedBy: userId } } },
    { new: true }
  ).populate("comments.commentedBy", "username");

  res.json(post);
};

// Delete Post
const deletePost = async (req, res) => {
  const { id } = req.params;
  const post = await Post.findByIdAndDelete(id);
  if (post) {
    res.status(200).json({ message: "Post deleted successfully" });
  } else {
    res.status(404).json({ message: "Post not found" });
  }
};

// Public all posts
const getPublicPosts = async (req, res) => {
  try {
    const allPosts = await Post.find();
    res.status(200).json(allPosts);
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};


export {getAllPosts,getPublicPosts,deletePost,commentPost,unlikePost,likePost}