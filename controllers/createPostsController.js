import Post from "../models/postModel.js";

export const createPost = async (req, res) => {
  try {
    console.log("FILES:", req.files);
    console.log("BODY:", req.body);

    const { caption, mediaType } = req.body;

    if (!req.files || !req.files.image) {
      return res.status(400).json({
        error: "Media file missing",
      });
    }

    const mediaFile = req.files.image[0];

    console.log("Uploaded media:", mediaFile);

    const mediaUrl = mediaFile.path;

    const musicUrl =
      req.files.backgroundMusic?.[0]?.path || null;

    const post = await Post.create({
      caption,
      mediaType,
      mediaUrl,
      backgroundMusic:
        mediaType === "image" ? musicUrl : null,
      postedBy: req.user.id,
    });

    return res.status(201).json({
      message: "Post created successfully",
      post,
    });
  } catch (err) {
    console.error("FULL ERROR:", err);

    return res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
};