import { getIO } from "./socketService.js";
import { sanitizeChatMessage, sanitizeCustomerService } from "../util/apiResponseDTO.js";
import _env from "../config/env.js";
const { env } = _env;

const DASH_URL = process.env.DASH_BACKEND_URL || "http://127.0.0.1:4001";

/**
 * Broadcasts a newly sent support message to all connected clients on SITE/BACKEND
 * and forwards the event to DASH/back (port 4001) for admin desks.
 */
export async function broadcastNewMessage(message, customerService = null) {
  const io = getIO();
  const convId = (message.customerService || customerService?._id || "").toString();
  const sanitized = sanitizeChatMessage(message);

  // 1. Local real-time emit on SITE/BACKEND
  if (io && convId) {
    try {
      io.to(`customerService_${convId}`).emit("newMessage", sanitized);
      io.to(`ticket_${convId}`).emit("newMessage", sanitized);
      io.to(convId).emit("newMessage", sanitized);
      if (customerService?.user) {
        io.to(`user_${customerService.user}`).emit("newMessage", sanitized);
      }
    } catch (err) {
      console.error("[SupportBroadcast] Local emit error:", err.message);
    }
  }

  // 2. Notify DASH/back asynchronously
  try {
    fetch(`${DASH_URL}/api/admin/customerServices/internal-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": env.ADMIN_JWT_SECRET,
      },
      body: JSON.stringify({
        type: "newMessage",
        message: sanitized,
        customerService: customerService ? sanitizeCustomerService(customerService) : undefined,
      }),
    }).catch(() => {});
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Broadcasts a ticket update or status change to local clients and forwards to DASH/back.
 */
export async function broadcastTicketUpdate(customerService, statusChanged = false) {
  const io = getIO();
  const convId = customerService?._id ? customerService._id.toString() : null;
  const sanitized = sanitizeCustomerService(customerService);

  if (io && convId) {
    try {
      if (statusChanged) {
        io.to(`customerService_${convId}`).emit("ticketStatusChanged", sanitized);
        io.to(`ticket_${convId}`).emit("ticketStatusChanged", sanitized);
        io.to(`customerService_${convId}`).emit("customerServiceStatusChanged", sanitized);
      }
      if (customerService.user) {
        io.to(`user_${customerService.user}`).emit("ticketStatusChanged", sanitized);
      }
    } catch (err) {
      console.error("[SupportBroadcast] Local status emit error:", err.message);
    }
  }

  // Notify DASH/back
  try {
    fetch(`${DASH_URL}/api/admin/customerServices/internal-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": env.ADMIN_JWT_SECRET,
      },
      body: JSON.stringify({
        type: "customerServiceUpdated",
        customerService: sanitized,
      }),
    }).catch(() => {});
  } catch (err) {
    // Non-blocking
  }
}

export default {
  broadcastNewMessage,
  broadcastTicketUpdate,
};

