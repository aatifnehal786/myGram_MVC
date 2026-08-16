import User from '../models/userModel.js';
export const updateProfilePicController = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const profilePicUrl = req.file.path || req.file.secure_url;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePic: profilePicUrl },
      { new: true, select: "-password" }
    );

    res.json({ message: 'Profile picture updated', profilePic: profilePicUrl, user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile picture' });
  }
};