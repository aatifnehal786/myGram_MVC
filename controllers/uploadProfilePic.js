import User from '../models/userModel.js'

export const uploadProfilePic = async (req, res) => {
  try {
    if (!req.file?.path) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePic: req.file.path },
      { new: true }
    );

    res.status(200).json({
      message: "Profile picture updated",
      profilePic: req.file.path,
      user: updatedUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile picture" });
  }
};
