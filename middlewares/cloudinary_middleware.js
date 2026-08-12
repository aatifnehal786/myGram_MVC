import multer from 'multer';
import {CloudinaryStorage} from 'multer-storage-cloudinary'
import cloudinary from '../config/cloudinary.js'
import path from "path";

// Profile Pic Storage
const profilePicStorage = new CloudinaryStorage({
  cloudinary:cloudinary,
  params: {
    folder: "profile_pics",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 300, height: 300, crop: "limit" }],
  },
});
const uploadProfilePic = multer({ storage: profilePicStorage });

// Post & Music Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = "posts";

    if (file.fieldname === "backgroundMusic") {
      folder = "music";
    }
    if (req.originalUrl.includes('status')) {
      folder = "status"; // ✅ for status
    }

    return {
      folder,
      resource_type: "auto",
      public_id: `${Date.now()}-${path
        .parse(file.originalname)
        .name.replace(/\s+/g, "-")}`,
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    // images
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",

    // videos
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-matroska",

    // audio
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"), false);
  }
};

const upload = multer({ storage: storage,

  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 100, // 100 MB
  },
});

export { uploadProfilePic, upload };

