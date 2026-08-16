import Post from "../models/postModel.js";

export const createPost = async (req, res) => {
  try {
    console.log("FILES:", req.files);
    console.log("BODY:", req.body);

    const { caption, mediaType } = req.body;

    const mediaFile = req.files?.media?.[0];
    if (!mediaFile) {
      return res.status(400).json({ success: false, error: "Media file missing" });
    }

    const mediaUrl = mediaFile.path || mediaFile.secure_url;
    const musicFile = req.files.backgroundMusic?.[0];
    const musicUrl = musicFile?.path || musicFile?.secure_url || null;

    const post = await Post.create({
      caption,
      mediaType: mediaType || (mediaFile.mimetype.startsWith("video")? "video" : "image"),
      mediaUrl,
      backgroundMusic: musicUrl, // allow music for video too if you want
      postedBy: req.user._id || req.user.id,
    });

    return res.status(201).json({ success: true, post });
  } catch (err) {
    console.error("FULL ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};