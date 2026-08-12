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
    const currentUser = await User.findById(req.user._id);
    const followingIds = [...currentUser.following, req.user._id];

    const statuses = await Status.find({
      user: { $in: followingIds },
      expiresAt: { $gt: new Date() }
    }).populate('user', 'username profilePic').populate('viewers', 'username profilePic').sort({ createdAt: 1 });

    const grouped = {};
    statuses.forEach(s => {
      const uid = s.user._id.toString();
      if (!grouped[uid]) grouped[uid] = { user: s.user, statuses: [] };
      grouped[uid].statuses.push(s);
    });
    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getStatusViewers = async (req, res) => {
  const status = await Status.findById(req.params.id).populate('viewers', 'username profilePic');
  if (!status) return res.status(404).json({ error: "Not found" });
  res.json(status.viewers);
};

export const viewStatus = async (req, res) => {
  await Status.findByIdAndUpdate(req.params.id, {
    $addToSet: { viewers: req.user._id }
  });
  res.json({ success: true });
};

export const deleteStatus = async (req, res) => {
  await Status.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ success: true });
};