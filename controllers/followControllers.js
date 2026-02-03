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

// POST /api/follow/request/:userId
const sendFollowRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.userId;

    if (senderId.equals(receiverId)) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: "User not found" });

    if (
      receiver.followRequests.includes(senderId) ||
      receiver.followers.includes(senderId)
    ) {
      return res.status(400).json({ message: "Already requested or following" });
    }

    receiver.followRequests.push(senderId);
    await receiver.save();

    res.json({ message: "Follow request sent" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


// GET /api/follow/requests
const getFollowRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("followRequests", "username profilePic");

    res.json(user.followRequests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/follow/accept/:senderId
const acceptFollowRequest = async (req, res) => {
  try {
    const receiverId = req.user._id;
    const senderId = req.params.senderId;

    const receiver = await User.findById(receiverId);
    const sender = await User.findById(senderId);

    if (!receiver || !sender) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove request
    receiver.followRequests = receiver.followRequests.filter(
      (id) => id.toString() !== senderId
    );

    // Add follower / following
    receiver.followers.push(senderId);
    sender.following.push(receiverId);

    await receiver.save();
    await sender.save();

    res.json({
      message: "Follow request accepted",
      followersCount: receiver.followers.length,
      followingCount: sender.following.length,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/follow/reject/:senderId
const rejectFollowRequest = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    user.followRequests = user.followRequests.filter(
      (id) => id.toString() !== req.params.senderId
    );

    await user.save();

    res.json({ message: "Follow request rejected" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


export {getFollowers,followStatus,unfollowUser,followUser,sendFollowRequest,getFollowRequests,acceptFollowRequest,rejectFollowRequest};