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






// Make sure cloudinary.config({...}) is done before this
// Example:
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = path.extname(file.originalname).toLowerCase();
    let folder = "posts";

    if (file.fieldname === "backgroundMusic") folder = "music";

    return {
      folder,
      resource_type: "auto", // auto-detect image, video, audio
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    };
  },
});







const upload = multer({ storage });

export { uploadProfilePic, upload };

