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
  cloudinary: cloudinary,   // ⬅ required
  params: async (req, file) => {
    let folder = "uploads";

    if (file.fieldname === "profilePic") {
      folder = "profile_pics";
    } else if (file.fieldname === "chatFile") {
      folder = "chat_files";
    }

    return {
      folder,
      resource_type: "auto", // handles images, videos, pdfs etc.
    };
  },
});


const upload = multer({ storage });

export { uploadProfilePic, upload };

