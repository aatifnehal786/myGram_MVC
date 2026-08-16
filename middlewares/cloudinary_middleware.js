import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';
import path from "path";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "posts";
    if (file.fieldname === "backgroundMusic") folder = "music";
    if (file.fieldname === "profilePic") folder = "profile_pics";
    if (req.originalUrl.includes('status')) folder = "status";

    return {
      folder,
      resource_type: "auto",
      public_id: `${Date.now()}-${path.parse(file.originalname).name.replace(/\s+/g, "-")}`,
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/png","image/jpeg","image/jpg","image/webp",
    "video/mp4","video/webm","video/quicktime","video/x-matroska",
    "audio/mpeg","audio/mp3","audio/wav",
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Unsupported: " + file.mimetype), false);
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } });

export const uploadProfilePic = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "profile_pics",
      allowed_formats: ["jpg","jpeg","png","webp"],
      transformation: [{ width: 500, height: 500, crop: "fill", gravity: "face" }],
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
});