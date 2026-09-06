import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';
import path from "path";

const getSafeName = (originalname) => {
  const parsed = path.parse(originalname);
  // keep original name, just replace spaces and remove unsafe chars
  const safeBase = parsed.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "");
  return { safeBase, ext: parsed.ext, full: originalname };
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "posts";
    if (file.fieldname === "backgroundMusic") folder = "music";
    if (file.fieldname === "profilePic") folder = "profile_pics";
    if (req.originalUrl.includes('status')) folder = "status";

    const { safeBase, full } = getSafeName(file.originalname);

    return {
      folder,
      resource_type: "auto",
      public_id: safeBase, // This will be the file name in cloudinary
      use_filename: true,
      unique_filename: false, // set to true if you want to avoid overwriting same name
      filename_override: full, // This forces original filename on download
      flags: `attachment:${full}`, // This makes browser download with original filename
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

// If you ALSO want original name for profile pics
export const uploadProfilePic = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const { safeBase, full } = getSafeName(file.originalname);
      return {
        folder: "profile_pics",
        public_id: safeBase,
        use_filename: true,
        unique_filename: false,
        filename_override: full,
        allowed_formats: ["jpg","jpeg","png","webp"],
        transformation: [{ width: 500, height: 500, crop: "fill", gravity: "face" }],
      };
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});