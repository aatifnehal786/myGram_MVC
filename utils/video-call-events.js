import Message from "../models/messageModel.js";

const handleVideoCallEvents = (socket, io, onlineUsers) => {

  const emitToUser = (userId, event, data) => {
    const sockets = onlineUsers.get(userId);
    if (!sockets) return;
    sockets.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
  };

  const saveCallLog = async ({ senderId, receiverId, text, type }) => {
    try {
      const msg = await Message.create({
        sender: senderId,
        receiver: receiverId,
        message: text,
        messageType: "call_log",
        callInfo: { type, duration: 0 }
      });
      // decrypt will happen in post find, but for socket emit we need plain
      const plain = msg.toObject();
      plain.message = text;
      io.to(senderId).toString && null;
      // emit to both users as newMessage so ChatWindow renders it
      emitToUser(senderId, "newMessage", plain);
      emitToUser(receiverId, "newMessage", plain);
      // also keep old event for VideoCallStore
      emitToUser(senderId, "new_message", plain);
      emitToUser(receiverId, "new_message", plain);
    } catch (e) { console.error("call log save failed", e); }
  };

  // Initiate call
  socket.on("initiate_call", ({ callerId, receiverId, callType, callerInfo, callId }) => {
    const finalCallId = callId || `${callerId}-${receiverId}-${Date.now()}`;
    const avatar = callerInfo.profilePicture || callerInfo.profilePic || "/placeholder.svg";
    const name = callerInfo.username || callerInfo.name || "Unknown";

    emitToUser(receiverId, "incoming_call", {
      callerId,
      callerName: name,
      callerAvatar: avatar,
      callerPic: avatar,
      callType,
      callId: finalCallId,
    });

    // ✅ Auto timeout - if not accepted in 30s -> Missed
    setTimeout(async () => {
      // check if still ringing - you can track in onlineUsers or just emit
      // we save missed if no accept happened
      // For simplicity, client will emit call_not_answered, but backup here:
    }, 30000);
  });

  // Accept call
  socket.on("accept_call", ({ callerId, callId, receiverInfo }) => {
    emitToUser(callerId, "call_accepted", {
      callId,
      receiverName: receiverInfo.username,
      receiverAvatar: receiverInfo.profilePicture,
    });
  });

  // Reject call -> SAVE AS MESSAGE
  socket.on("reject_call", async ({ callerId, receiverId, callId }) => {
    const actualCaller = callerId || socket.userId;
    const actualReceiver = receiverId || socket.userId;

    emitToUser(actualCaller, "call_rejected", { callId });

    // ✅ Save "Video call not accepted" as chat message
    await saveCallLog({
      senderId: actualCaller,
      receiverId: actualReceiver,
      text: "Video call declined",
      type: "rejected"
    });
  });

  // Not answered / timeout from frontend
  socket.on("call_not_answered", async ({ callerId, receiverId, callId }) => {
    emitToUser(callerId, "call_not_answered", { callId });
    await saveCallLog({
      senderId: callerId,
      receiverId: receiverId,
      text: "Missed video call",
      type: "missed"
    });
  });

  // End call - save duration if >0
  socket.on("end_call", async ({ participantId, callId, duration = 0 }) => {
    emitToUser(participantId, "call_ended", { callId });
    if (duration > 5) {
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      const text = `Video call ended • ${mins > 0? `${mins}m ` : ""}${secs}s`;
      await saveCallLog({
        senderId: socket.userId,
        receiverId: participantId,
        text,
        type: "ended"
      });
    }
  });

  // WebRTC
  socket.on("webrtc_offer", ({ receiverId, offer, callId }) => {
    emitToUser(receiverId, "webrtc_offer", { offer, senderId: socket.userId, callId });
  });
  socket.on("webrtc_answer", ({ receiverId, answer, callId }) => {
    emitToUser(receiverId, "webrtc_answer", { answer, senderId: socket.userId, callId });
  });
  socket.on("webrtc_ice_candidate", ({ receiverId, candidate, callId }) => {
    emitToUser(receiverId, "webrtc_ice_candidate", { candidate, senderId: socket.userId, callId });
  });
};

export default handleVideoCallEvents;