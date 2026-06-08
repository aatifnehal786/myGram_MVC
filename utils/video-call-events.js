const handleVideoCallEvents = (socket, io, onlineUsers) => {

  const emitToUser = (userId, event, data) => {
    const sockets = onlineUsers.get(userId);

    if (!sockets) return;

      console.log(
    "EMIT:",
    event,
    "TO:",
    userId,
    "SOCKETS:",
    sockets
  );


    sockets.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
  };

  // Initiate call
  socket.on(
    "initiate_call",
    ({ callerId, receiverId, callType, callerInfo, callId }) => {
      emitToUser(receiverId, "incoming_call", {
        callerId,
        callerName: callerInfo.username,
        callerAvatar: callerInfo.profilePicture,
        callType,
        callId,
      });
    }
  );

  // Accept call
  socket.on(
    "accept_call",
    ({ callerId, callId, receiverInfo }) => {
      emitToUser(callerId, "call_accepted", {
        callId,
        receiverName: receiverInfo.username,
        receiverAvatar: receiverInfo.profilePicture,
      });
    }
  );

  // Reject call
  socket.on(
    "reject_call",
    ({ callerId, callId }) => {
      emitToUser(callerId, "call_rejected", {
        callId,
      });
    }
  );

  // End call
  socket.on(
    "end_call",
    ({ participantId, callId }) => {
      emitToUser(participantId, "call_ended", {
        callId,
      });
    }
  );

  // Offer
  socket.on(
  "webrtc_offer",
  ({ receiverId, offer, callId }) => {

    console.log("socket.userId =", socket.userId);
    console.log("receiverId =", receiverId);

    emitToUser(receiverId, "webrtc_offer", {
      offer,
      senderId: socket.userId,
      callId,
    });
  }
);

  // Answer
  socket.on(
  "webrtc_answer",
  ({ receiverId, answer, callId }) => {

    console.log("socket.userId =", socket.userId);
    console.log("receiverId =", receiverId);

    emitToUser(receiverId, "webrtc_answer", {
      answer,
      senderId: socket.userId,
      callId,
    });
  }
);

  // ICE candidate
 socket.on(
  "webrtc_ice_candidate",
  ({ receiverId, candidate, callId }) => {

    console.log("socket.userId =", socket.userId);
    console.log("receiverId =", receiverId);

    emitToUser(receiverId, "webrtc_ice_candidate", {
      candidate,
      senderId: socket.userId,
      callId,
    });
  }
);
};

export default handleVideoCallEvents;