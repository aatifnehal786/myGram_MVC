import User from '../models/userModel.js'
import Post from '../models/postModel.js'

export const getUserStats = async (req, res) => {
  try {
    // Only select what you need - never return email/mobile here
    const user = await User.findById(req.params.id).select("username profilePic followers following");
    if(!user) return res.status(404).json({ error: "User not found" });
    
    const posts = await Post.find({ postedBy: req.params.id }).select("likes");
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
    // SAFE: only username, profilePic
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
    if(!newUsername || newUsername.trim().length < 3) {
      return res.status(400).json({ error: "Username too short" });
    }
    // IMPORTANT: Check username uniqueness separately because email is encrypted now
    const exists = await User.findOne({ username: newUsername.trim(), _id: { $ne: req.user._id } });
    if(exists) return res.status(409).json({ error: "Username taken" });

    const updated = await User.findByIdAndUpdate(
      req.user._id, 
      { username: newUsername.trim() }, 
      { new: true }
    ).select("username profilePic"); // NEVER return emailHash/mobileHash

    res.json({ message: "Updated", newUsername: updated.username, user: updated });
  } catch (err) { 
    if(err.code === 11000) return res.status(409).json({ error: "Username taken" });
    res.status(500).json({ error: 'Server error' }); 
  }
};

export const getAllUsersStats = async (req, res) => {
  try {
    // Aggregation bypasses mongoose decrypt hooks - so ONLY project non-encrypted fields
    const usersData = await User.aggregate([
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'postedBy',
          as: 'posts'
        }
      },
      {
        $project: {
          username: 1,
          profilePic: 1,
          followersCount: { $size: '$followers' },
          followingCount: { $size: '$following' },
          postsCount: { $size: '$posts' },
          // likesReceived will be wrong if you sum array of arrays - fixed:
          likesReceived: { $sum: { $map: { input: "$posts", as: "p", in: { $size: "$$p.likes" } } } }
        }
      }
    ]);
    res.json(usersData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};