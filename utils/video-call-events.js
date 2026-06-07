// Fixed server-side events with proper userId handling
const emitToUser = (userId, event, data) => {
  const sockets = onlineUsers.get(userId);

  if (!sockets) return;

  sockets.forEach((socketId) => {
    io.to(socketId).emit(event, data);
  });
};
const handleVideoCallEvents = (socket, io, onlineUsers) => {
  // Initiate video call
  socket.on("initiate_call", ({ callerId, receiverId, callType, callerInfo }) => {
    console.log(` SERVER: Call initiated from ${callerId} to ${receiverId}`)

   emitToUser(receiverId, "incoming_call", {
  callerId,
  callerName: callerInfo.username,
  callerAvatar: callerInfo.profilePicture,
  callType,
  callId,
});
  })

  // Accept call
  emitToUser(callerId, "call_accepted", {
  callId,
  receiverName: receiverInfo.username,
  receiverAvatar: receiverInfo.profilePicture,
});

  // Reject call
 emitToUser(callerId, "call_rejected", {
  callId,
});
  // End call
  emitToUser(participantId, "call_ended", {
  callId,
});

  // WebRTC signaling events with proper userId handling
  emitToUser(receiverId, "webrtc_offer", {
  offer,
  senderId: socket.userId,
  callId,
});

 emitToUser(receiverId, "webrtc_answer", {
  answer,
  senderId: socket.userId,
  callId,
});

 emitToUser(receiverId, "webrtc_ice_candidate", {
  candidate,
  senderId: socket.userId,
  callId,
});
}


export default handleVideoCallEvents;