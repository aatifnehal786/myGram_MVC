import express from 'express';
import auth from '../middlewares/auth.js'
import { 
  uploadChatFile, 
  deleteChatMessages, 
  getChat, 
  searchUsers, 
  getChatList, 
  forwardMessage, 
 
} from '../controllers/chatController.js';



const router = express.Router();

router.post("/upload", auth, uploadChatFile);
router.delete("/delete-chat", auth, deleteChatMessages);

router.get("/chat/:userId", auth, getChat);
// router.get("/search-users", auth, (req, res) => searchUsers(req, res, global.onlineUsers));
router.get("/search-users",auth, (req, res) => searchUsers(req, res, global.onlineUsers));
router.get("/chat-list", auth, getChatList);
router.post("/chat/forward", auth, forwardMessage);



export default router;
