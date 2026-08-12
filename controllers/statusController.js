import Status from '../models/statusModel.js';
import User from '../models/userModel.js';

export const createStatus = async (req, res) => {
  try {
    const { text, bgColor, mediaType } = req.body;
    let mediaUrl = null;

    if (req.file) {
      mediaUrl = req.file.path; // if using cloudinary multer
    }

    const status = await Status.create({
      user: req.user.id,
      text,
      bgColor,
      mediaUrl,
      mediaType: mediaUrl? (mediaType || 'image') : 'text'
    });

    res.status(201).json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getFeedStatus = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const followingIds = [...currentUser.following, req.user.id];

    const statuses = await Status.find({
      user: { $in: followingIds },
      expiresAt: { $gt: new Date() }
    })
   .populate('user', 'username profilePic')
   .sort({ createdAt: -1 });

    // Group by user
    const grouped = {};
    statuses.forEach(s => {
      if (!grouped[s.user._id]) grouped[s.user._id] = { user: s.user, statuses: [] };
      grouped[s.user._id].statuses.push(s);
    });

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const viewStatus = async (req, res) => {
  await Status.findByIdAndUpdate(req.params.id, {
    $addToSet: { viewers: req.user._id }
  });
  res.json({ success: true });
};

export const deleteStatus = async (req, res) => {
  await Status.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  res.json({ success: true });
};