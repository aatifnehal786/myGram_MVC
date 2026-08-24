import Status from '../models/statusModel.js';
import User from '../models/userModel.js';

export const createStatus = async (req, res) => {
  try {
    const { text, mediaType, bgColor } = req.body;
    let mediaUrl = null;
    let finalMediaType = mediaType || 'text';
    if (req.file) {
      mediaUrl = req.file.path || req.file.secure_url;
      finalMediaType = req.file.mimetype?.startsWith('video')? 'video' : 'image';
    }
    if (!mediaUrl &&!text) return res.status(400).json({ error: "Text or media required" });

    const status = await Status.create({
      user: req.user._id,
      mediaUrl, // plain URL - not encrypted
      mediaType: mediaUrl? finalMediaType : 'text',
      text: text || null, // model will encrypt this
      bgColor: bgColor || '#000000',
    });

    // Return decrypted for immediate frontend display
    const plain = status.toObject();
    const { decrypt } = await import("../utils/encryption.js");
    if(plain.text) plain.text = decrypt(plain.text);
    res.status(201).json(plain);

  } catch (err) {
    console.error("Create Status Error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getFeedStatus = async (req, res) => {
  try {
    // FIX: select only following field to avoid loading decrypted email in memory unnecessarily
    const currentUser = await User.findById(req.user._id).select("following");
    const followingIds = [...currentUser.following, req.user._id];

    const statuses = await Status.find({
      user: { $in: followingIds },
      expiresAt: { $gt: new Date() }
    }).populate('user', 'username profilePic').populate('viewers', 'username profilePic').sort({ createdAt: -1 });

    // statuses.text is already auto-decrypted by post hook

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
  await Status.findByIdAndUpdate(req.params.id, { $addToSet: { viewers: req.user._id } });
  res.json({ success: true });
};

export const deleteStatus = async (req, res) => {
  await Status.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ success: true });
};