import User from '../models/userModel.js'
import Post from '../models/postModel.js'

// User stats
export const getUserStats = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId)
      .populate("followers", "username")
      .populate("following", "username");

    if (!user) return res.status(404).json({ error: "User not found" });

    const posts = await Post.find({ postedBy: userId });
    const postCount = posts.length;
    const totalLikes = posts.reduce((acc, post) => acc + post.likes.length, 0);

    res.json({
      username: user.username,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      postsCount: postCount,
      likesReceived: totalLikes,
      profilePic: user.profilePic,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all users except current
export const getAllUsersExceptMe = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const users = await User.find({ _id: { $ne: loggedInUserId } });
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error while fetching users" });
  }
};

// Get all users (including current)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error while fetching users" });
  }
};
