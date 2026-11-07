import socketService from "../services/socketService.js";

const clients = new Map(); // userId -> Set of response objects

async function addClient(userId, res) {
  const uid = String(userId);
  if (!clients.has(uid)) {
    clients.set(uid, new Set());
  }
  clients.get(uid).add(res);
}

async function removeClient(userId, res) {
  const uid = String(userId);
  if (clients.has(uid)) {
    const userClients = clients.get(uid);
    userClients.delete(res);
    if (userClients.size === 0) {
      clients.delete(uid);
    }
  }
}

async function notifyUser(userId, data) {
  const uid = String(userId);

  // 1. Send to Server-Sent Events clients with instant flush
  if (clients.has(uid)) {
    const userClients = clients.get(uid);
    const message = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of userClients) {
      try {
        client.write(message);
        if (typeof client.flush === "function") {
          client.flush();
        }
      } catch (err) {
        // ignore write error on closed client
      }
    }
  }

  // 2. Broadcast via Socket.IO directly to user room
  try {
    const io = await socketService.getIO().catch(() => null);
    if (io) {
      const room = socketService.getRoomTarget(io, `user_${uid}`);
      if (room) {
        room.emit("dashboard_update", data);
        room.emit("notification", data);
        if (data?.type) {
          room.emit(data.type, data);
        }
      }
    }
  } catch (err) {
    // Socket emit should never block
  }
}

export default {
  clients,
  addClient,
  removeClient,
  notifyUser,
};
