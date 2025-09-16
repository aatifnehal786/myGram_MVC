import User from "../models/userModel.js";

// ✅ Profile Pic Upload Controller
export const uploadProfilePic = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log("Authenticated user:", req.user);

    const userId = req.user._id;
    const profilePicUrl = req.file.path; // Cloudinary URL

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: profilePicUrl },
      { new: true }
    );

    res.status(200).json({
      message: 'Profile picture updated',
      profilePic: profilePicUrl,
      user: updatedUser
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile picture' });
  }
};

