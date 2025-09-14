import Post from '../models/postModel.js'

const createPost = async (req, res) => {
  try {
    const { caption, mediaType } = req.body;
    const imageFile = req.files?.image?.[0];
    const musicFile = req.files?.backgroundMusic?.[0];

    if (!imageFile) return res.status(400).json({ error: "Media file is required." });

    const post = await Post.create({
      caption,
      mediaType,
      mediaUrl: imageFile.path,
      backgroundMusic: mediaType === "image" && musicFile ? musicFile.path : null,
      postedBy: req.user.id,
    });

    res.status(201).json({ post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export {createPost}