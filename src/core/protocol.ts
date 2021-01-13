const actions = {
  AUTHENTICATE: "authenticate",
  JOIN_ROOM: "joinRoom",
  SEND_MESSAGE: "sendMessage",
  UPDATE_STATUS: "updateStatus",
};

const events = {
  AUTHENTICATED: "authenticated",
  JOINED_ROOM: "joinedRoom",
  NEW_MESSAGE: "newMessage",
  USER_LEFT_ROOM: "userLeftRoom",
  USER_JOINED_ROOM: "userJoinedRoom",
  USER_STATUS_UPDATE: "userStatusUpdate",
  ROOM_STATUS_UPDATE: "roomStatusUpdate",
  ERROR: "error",
};

const avatars = {
  BULBASAUR: "bulbasaur",
  CHARMANDER: "charmander",
  SQUIRTLE: "squirtle",
};

export const PixlyProtocol = {
  events,
  actions,
  avatars,
};

export default PixlyProtocol;
