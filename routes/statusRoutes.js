import express from 'express';
import auth from '../middlewares/auth.js';
import { createStatus, getFeedStatus, viewStatus, deleteStatus, getStatusViewers } from '../controllers/statusController.js';
import { upload } from '../middlewares/cloudinary_middleware.js'; // ✅ use { upload }

const router = express.Router();

router.post('/create', auth, upload.single('media'), createStatus);
router.get('/feed', auth, getFeedStatus);
router.put('/view/:id', auth, viewStatus);
router.get('/viewers/:id', auth, getStatusViewers);
router.delete('/:id', auth, deleteStatus);

export default router;