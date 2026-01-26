const emitToUser = (io, onlineUsers, userId, event, payload) => {
  const sockets = onlineUsers.get(userId)
  if (!sockets) return
  sockets.forEach((socketId) => {
    io.to(socketId).emit(event, payload)
  })
}

const handleVideoCallEvents = (socket, io, onlineUsers) => {

  socket.on("initiate_call", ({ callerId, receiverId, callType, callId, callerInfo }) => {
    console.log(`📞 Call from ${callerId} → ${receiverId}`)

    if (!onlineUsers.has(receiverId)) {
      socket.emit("call_failed", { reason: "User is offline" })
      return
    }

    emitToUser(io, onlineUsers, receiverId, "incoming_call", {
      callerId,
      callerName: callerInfo.username,
      callerAvatar: callerInfo.profilePicture,
      callType,
      callId,
    })
  })

  socket.on("accept_call", ({ callerId, callId, receiverInfo }) => {
    emitToUser(io, onlineUsers, callerId, "call_accepted", {
      callId,
      receiverName: receiverInfo.username,
      receiverAvatar: receiverInfo.profilePicture,
    })
  })

  socket.on("reject_call", ({ callerId, callId }) => {
    emitToUser(io, onlineUsers, callerId, "call_rejected", { callId })
  })

  socket.on("end_call", ({ callId, participantId }) => {
    emitToUser(io, onlineUsers, participantId, "call_ended", { callId })
  })

  socket.on("webrtc_offer", ({ offer, receiverId, callId }) => {
    emitToUser(io, onlineUsers, receiverId, "webrtc_offer", {
      offer,
      senderId: socket.userId,
      callId,
    })
  })

  socket.on("webrtc_answer", ({ answer, receiverId, callId }) => {
    emitToUser(io, onlineUsers, receiverId, "webrtc_answer", {
      answer,
      senderId: socket.userId,
      callId,
    })
  })

  socket.on("webrtc_ice_candidate", ({ candidate, receiverId, callId }) => {
    emitToUser(io, onlineUsers, receiverId, "webrtc_ice_candidate", {
      candidate,
      senderId: socket.userId,
      callId,
    })
  })
}

export default handleVideoCallEvents
