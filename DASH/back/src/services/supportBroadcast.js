import socketService from "./socketService.js";
import _env from "../config/env.js";
const { env } = _env;

const SITE_URL = process.env.SITE_BACKEND_URL || "http://127.0.0.1:4000";

/**
 * Broadcasts an admin message locally on DASH/back and forwards it to SITE/BACKEND (port 4000).
 */
export async function broadcastAdminMessage(message, customerService = null) {
  let io = null;
  try {
    io = socketService.getIO ? socketService.getIO() : null;
  } catch (e) {}

  const convId = (message.customerService || customerService?._id || "").toString();

  // 1. Local emit on DASH/back
  if (io) {
    try {
      io.to("admin_room").emit("newMessage", message);
      if (convId) {
        io.to(`customerService_${convId}`).emit("newMessage", message);
        io.to(`ticket_${convId}`).emit("newMessage", message);
        io.to(convId).emit("newMessage", message);
      }
      if (customerService) {
        io.to("admin_room").emit("customerServiceUpdated", customerService);
      }
    } catch (err) {
      console.error("[SupportBroadcast Admin] Local emit error:", err.message);
    }
  }

  // 2. Forward to SITE/BACKEND
  try {
    const res = await fetch(`${SITE_URL}/api/support/internal-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": env.ADMIN_JWT_SECRET,
      },
      body: JSON.stringify({
        type: "newMessage",
        message,
        customerService,
      }),
    });
  } catch (err) {
    console.error("[SupportBroadcast Admin] Forward to SITE/BACKEND failed:", err.message);
  }
}

/**
 * Broadcasts status updates (resolve, close, reopen) locally and forwards to SITE/BACKEND.
 */
export async function broadcastAdminTicketStatus(customerService, sysMessage = null) {
  const io = socketService.getIO ? socketService.getIO() : null;
  const convId = (customerService?._id || "").toString();

  // 1. Local emit on DASH/back
  if (io) {
    try {
      io.to("admin_room").emit("customerServiceUpdated", customerService);
      io.to("admin_room").emit("customerServiceStatusChanged", customerService);

      if (convId) {
        io.to(`customerService_${convId}`).emit("customerServiceStatusChanged", customerService);
        io.to(`ticket_${convId}`).emit("ticketStatusChanged", customerService);
        if (sysMessage) {
          io.to("admin_room").emit("newMessage", sysMessage);
          io.to(`customerService_${convId}`).emit("newMessage", sysMessage);
          io.to(`ticket_${convId}`).emit("newMessage", sysMessage);
          io.to(convId).emit("newMessage", sysMessage);
        }
      }
    } catch (err) {
      console.error("[SupportBroadcast Admin] Status emit error:", err.message);
    }
  }

  // 2. Forward to SITE/BACKEND
  try {
    fetch(`${SITE_URL}/api/support/internal-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": env.ADMIN_JWT_SECRET,
      },
      body: JSON.stringify({
        type: "statusChanged",
        customerService,
        sysMessage,
      }),
    }).catch(() => {});
  } catch (err) {
    // Non-blocking
  }
}

export default {
  broadcastAdminMessage,
  broadcastAdminTicketStatus,
};

