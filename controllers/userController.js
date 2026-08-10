import User from '../models/userModel.js'
import Post from '../models/postModel.js'

export const getUserStats = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const posts = await Post.find({ postedBy: req.params.id });
    res.json({
      _id: user._id,
      username: user.username,
      profilePic: user.profilePic,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      postsCount: posts.length,
      likesReceived: posts.reduce((a, p) => a + p.likes.length, 0),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getAllUsersExceptMe = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select("username profilePic");
    res.json(users);
  } catch { res.status(500).json({ error: "Server error" }); }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("username profilePic");
    res.json(users);
  } catch { res.status(500).json({ error: "Server error" }); }
};


export const updateUserProfile = async (req, res) => {
  try {
    const { newUsername } = req.body;
    const updated = await User.findByIdAndUpdate(req.user._id, { username: newUsername.trim() }, { new: true }).select("-password");
    res.json({ message: "Updated", newUsername: updated.username, user: updated });
  } catch { res.status(500).json({ error: 'Server error' }); }
};

// ONLY ONE for stats - aggregation version
export const getAllUsersStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      { $lookup: { from: "posts", localField: "_id", foreignField: "postedBy", as: "posts" } },
      {
        $project: {
          _id: 1, username: 1, profilePic: 1,
          followersCount: { $size: { $ifNull: ["$followers", []] } },
          followingCount: { $size: { $ifNull: ["$following", []] } },
          postsCount: { $size: "$posts" },
          likesReceived: { $sum: { $map: { input: "$posts", as: "p", in: { $size: { $ifNull: ["$$p.likes", []] } } } } }
        }
      }
    ]);
    res.json(stats);
  } catch (e) { res.status(500).json({ error: e.message }); }
};