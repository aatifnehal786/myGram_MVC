import Post from "../models/postModel.js";

export const createPost = async (req, res) => {
  try {
    console.log("Files received:", req.files);
    console.log("Body received:", req.body);

    const { caption, mediaType } = req.body;

    if (!req.files?.image?.[0]) {
      return res.status(400).json({ error: "Media file is required" });
    }

    const mediaFile = req.files.image[0];
    const imageUrl = mediaFile.path; // ✅ Cloudinary URL
    const musicUrl = req.files.backgroundMusic?.[0]?.path || null;

    const post = await Post.create({
      caption,
      mediaType,
      mediaUrl: imageUrl,
      backgroundMusic: mediaType === "image" ? musicUrl : null,
      postedBy: req.user.id,
    });

    res.status(201).json({
      message: "Post created successfully",
      post,
    });
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ error: err.message });
  }
};
