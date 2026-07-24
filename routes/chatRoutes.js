import express from 'express';
import auth from '../middlewares/auth.js'
import { 
  uploadChatFile, 
  deleteChatMessages, 
  getChat, 
  searchUsers, 
  getChatList, 
  forwardMessage, 
  deleteForMe,
  deleteForEveryone
 
} from '../controllers/chatController.js';
import {blockGuest} from '../controllers/blockGuest.js';



const router = express.Router();

router.post("/upload", auth,blockGuest, uploadChatFile);
router.delete("/delete-chat", auth, blockGuest, deleteChatMessages);

router.get("/chat/:userId",blockGuest, auth, getChat);
// router.get("/search-users", auth, (req, res) => searchUsers(req, res, global.onlineUsers));
router.get("/search-users",auth, (req, res) => searchUsers(req, res, global.onlineUsers));
router.get("/chat-list", auth, blockGuest, getChatList);
router.post("/chat/forward", auth, blockGuest, forwardMessage);
router.delete("/chat/deleteForMe/:messageId", auth, blockGuest, deleteForMe);
router.delete("/chat/deleteForEveryone/:messageId", auth, blockGuest, deleteForEveryone);



export default router;
