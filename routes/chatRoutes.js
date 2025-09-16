import express from 'express';
import auth from '../middlewares/auth.js'
import { 
  uploadChatFile, 
  deleteChatMessages, 
  getChat, 
  searchUsers, 
  getChatList, 
  forwardMessage, 
  setChatPin, 
  verifyChatPin, 
  checkChatPin, 
  forgotChatPin, 
  resetChatPin, 
  removeChatPin 
} from '../controllers/chatController.js';



const router = express.Router();

router.post("/upload", auth, uploadChatFile);
router.delete("/delete-chat", auth, deleteChatMessages);

router.get("/chat/:userId", auth, getChat);
// router.get("/search-users", auth, (req, res) => searchUsers(req, res, global.onlineUsers));
router.get("/search-users",auth, (req, res) => searchUsers(req, res, global.onlineUsers));
router.get("/chat-list", auth, getChatList);
router.post("/chat/forward", auth, forwardMessage);

// Chat PIN
router.post("/set-chat-pin", auth, setChatPin);
router.post("/verify-chat-pin", auth, verifyChatPin);
router.post("/check-chat-pin", auth, checkChatPin);
router.post("/forgot-chat-pin", auth, forgotChatPin);
router.post("/reset-chat-pin", auth, resetChatPin);
router.post("/remove-chat-pin", auth, removeChatPin);

export default router;
