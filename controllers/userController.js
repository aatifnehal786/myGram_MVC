import User from '../models/userModel.js'
import Post from '../models/postModel.js'

// User stats
// controllers/userController.js
export const getUserStats = async (req, res) => {
    try {
      const userId = req.params.id;
  
      const user = await User.findById(userId)
        .populate('followers', 'username')
        .populate('following', 'username');
  
      const posts = await Post.find({ postedBy: userId });
      const postCount = posts.length;
      const totalLikes = posts.reduce((acc, post) => acc + post.likes.length, 0);
  
      res.json({
        username: user.username,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        postsCount: postCount,
        likesReceived: totalLikes,
         profilePic: user.profilePic, // <-- add this
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


// get Followers of a user
export const getFollowers = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).populate('followers', 'username profilePic');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user.followers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error while fetching followers' });
  }
};

// get Following of a user
export const getFollowing = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).populate('following', 'username profilePic');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user.following);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error while fetching following' });
  }
};

// update username, bio, profilePic
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { username } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username },
      { new: true }
    ).select('-password');
    res.status(200).json(updatedUser);
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error while updating profile' });
  }   
};