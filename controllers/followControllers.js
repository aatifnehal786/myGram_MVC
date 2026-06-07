import User from "../models/userModel.js";
import Conversation from "../models/coversationModal.js";
/* ===========================
   FOLLOW USER
=========================== */
const followUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { targetUserId } = req.params;

    if (!targetUserId) {
      return res.status(400).json({ error: "Target user id is required" });
    }

    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // 🚫 Already following
    const isAlreadyFollowing = await User.exists({
      _id: currentUserId,
      following: targetUserId,
    });

    if (isAlreadyFollowing) {
      return res.status(200).json({ status: "following" });
    }

    // ✅ FOLLOW
    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { following: targetUserId },
    });

    await User.findByIdAndUpdate(targetUserId, {
      $addToSet: { followers: currentUserId },
    });

    res.status(200).json({
      message: "Followed successfully",
      status: "following",
    });
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({ error: "Server error while following" });
  }
};

/* ===========================
   UNFOLLOW USER
=========================== */
const unfollowUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { targetUserId } = req.params;

    if (!targetUserId) {
      return res.status(400).json({ error: "Target user id is required" });
    }

    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({ error: "You cannot unfollow yourself" });
    }

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { following: targetUserId },
    });

    await User.findByIdAndUpdate(targetUserId, {
      $pull: { followers: currentUserId },
    });

    res.status(200).json({
      message: "Unfollowed successfully",
      status: "follow",
    });
  } catch (error) {
    console.error("Unfollow error:", error);
    res.status(500).json({ error: "Server error while unfollowing" });
  }
};

/* ===========================
   FOLLOW STATUS
=========================== */
const followStatus = async (req, res) => {
  try {
    const loggedUserId = req.user._id;
    const { targetUserId } = req.params;

    const isFollowing = await User.exists({
      _id: targetUserId,
      followers: loggedUserId,
    });

    res.json({
      status: isFollowing ? "following" : "follow",
    });
  } catch (error) {
    console.error("Follow status error:", error);
    res.status(500).json({ status: "follow" });
  }
};

/* ===========================
   GET FOLLOWERS (WITH ONLINE)
=========================== */
const getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate("followers", "_id username profilePic lastSeen");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const conversations = await Conversation.find({
      participants: req.params.userId,
    }).populate("lastMessage");

    const conversationMap = {};

    conversations.forEach((conv) => {
      const otherUserId = conv.participants.find(
        (id) => id.toString() !== req.params.userId
      );

      if (otherUserId) {
        conversationMap[otherUserId.toString()] = {
          conversationId: conv._id,
          unreadCount:
            conv.unreadCounts.get(req.params.userId) || 0,
          lastMessage: conv.lastMessage,
        };
      }
    });

    const onlineUserIds = Array.from(global.onlineUsers?.keys() || []);

    const followersWithOnlineStatus = user.followers.map((f) => {
      const conversation =
        conversationMap[f._id.toString()] || {};

      return {
        _id: f._id,
        username: f.username,
        profilePic: f.profilePic,
        lastSeen: f.lastSeen,

        isOnline: onlineUserIds.includes(
          f._id.toString()
        ),

        conversationId:
          conversation.conversationId || null,

        unreadCount:
          conversation.unreadCount || 0,

        lastMessage:
          conversation.lastMessage || null,
      };
    });

    followersWithOnlineStatus.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;

      return (
        new Date(b.lastMessage.createdAt) -
        new Date(a.lastMessage.createdAt)
      );
    });

    res.json({ followers: followersWithOnlineStatus });
  } catch (error) {
    console.error("Get followers error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export {
  followUser,
  unfollowUser,
  followStatus,
  getFollowers,
};
