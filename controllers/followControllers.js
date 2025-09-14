import User from '../models/userModel.js'

// Follow
const followUser = async (req, res) => {
  const currentUserId = req.user._id;
  const { targetUserId } = req.params;

  if (!targetUserId) return res.status(400).json({ error: "Missing userId" });

  await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUserId } });
  await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUserId } });

  res.json({ message: "Followed" });
};

// Unfollow
const unfollowUser = async (req, res) => {
  const currentUserId = req.user._id;
  const { targetUserId } = req.params;

  if (!targetUserId) return res.status(400).json({ error: "Missing userId" });

  await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } });
  await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } });

  res.json({ message: "Unfollowed" });
};

// Follow status
const followStatus = async (req, res) => {
  const currentUserId = req.user._id;
  const { targetUserId } = req.params;

  const currentUser = await User.findById(currentUserId);
  if (!currentUser) return res.status(404).json({ error: "User not found" });

  const isFollowing = currentUser.following.includes(targetUserId);
  res.json({ isFollowing });
};

// Followers list with online status
const getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate("followers", "_id username profilePic lastSeen");
    if (!user) return res.status(404).json({ message: "User not found" });

    const onlineUserIds = Array.from(global.onlineUsers?.keys() || []);

    const followersWithOnlineStatus = user.followers.map(f => ({
      _id: f._id,
      username: f.username,
      profilePic: f.profilePic,
      lastSeen: f.lastSeen,
      isOnline: onlineUserIds.includes(f._id.toString())
    }));

    res.json({ followers: followersWithOnlineStatus });
  } catch (err) {
    console.error("Error fetching followers:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export {getFollowers,followStatus,unfollowUser,followUser}