import Post from "../models/postModel.js";

export const createPost = async (req, res) => {
  try {
    console.log("FILES:", req.files);
    console.log("BODY:", req.body);

    const { caption, mediaType } = req.body;

    // FIXED
    if (!req.files || !req.files.media) {
      return res.status(400).json({
        success: false,
        error: "Media file missing",
      });
    }

    // FIXED
    const mediaFile = req.files.media[0];

    console.log("Uploaded media:", mediaFile);

    const mediaUrl = mediaFile.path;

   const musicFile = req.files.backgroundMusic?.[0];

const musicUrl =
  musicFile?.path ||
  musicFile?.secure_url ||
  null;

    const post = await Post.create({
      caption,

      mediaType,

      mediaUrl,

      backgroundMusic:
        mediaType === "image"
          ? musicUrl
          : null,

      postedBy: req.user.id,
    });

    console.log(req.files);

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      post,
    });
  } catch (err) {
    console.error("FULL ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};