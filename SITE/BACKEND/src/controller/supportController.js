import User from "../models/User.js";
import _tokens3788 from "../util/tokens.js";
const { verifyAccessToken } = _tokens3788;
import CustomerService from "../models/CustomerService.js";
import ChatMessage from "../models/ChatMessage.js";
import _socketService9620 from "../services/socketService.js";
const { getIO, getRoomTarget } = _socketService9620;
import {
  broadcastNewMessage,
  broadcastTicketUpdate,
} from "../services/supportBroadcast.js";
import _env4335 from "../config/env.js";
const { env } = _env4335;

import { sanitizeCustomerService, sanitizeChatMessage } from "../util/apiResponseDTO.js";

function getGuestId(request) {
  return (
    request.cookies.supportGuestId ||
    request.body?.guestId ||
    request.query.guestId
  );
}

// ── Optional auth helper ──────────────────────────────────────────────────────
const optionalAuth = async (req, res, next) => {
  try {
    let token = "";
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) token = header.slice(7);

    if (token) {
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub);
      if (user) req.user = user;
    }
  } catch {
    // Ignore token errors — optional auth
  }
  next();
};

// ── POST /api/support/init ────────────────────────────────────────────────────
const initCustomerService = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const guestId = getGuestId(req);
    if (guestId && !req.cookies.supportGuestId) {
      res.cookie("supportGuestId", guestId, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });
    }
    let customerService;
    let isNew = false;

    if (req.user) {
      if (guestId) {
        customerService = await CustomerService.findOne({
          guestId,
          user: null,
          status: { $nin: ["closed", "resolved"] },
        });
        if (customerService) {
          customerService.user = req.user.id;
          customerService.name = req.user.name || name || customerService.name;
          customerService.email = req.user.email || email || customerService.email;
          await customerService.save();
        }
      }
      if (!customerService) {
        customerService = await CustomerService.findOne({
          user: req.user.id,
          status: { $nin: ["closed", "resolved"] },
        });
      }
      if (!customerService && name) {
        customerService = await CustomerService.create({
          user: req.user.id,
          name: req.user.name || name || "User",
          email: req.user.email || email,
        });
        isNew = true;
      }
    } else if (guestId) {
      customerService = await CustomerService.findOne({
        guestId,
        status: { $nin: ["closed", "resolved"] },
      });
      if (!customerService && name) {
        customerService = await CustomerService.create({
          guestId,
          name,
          email: email || "no-email@thenith.com",
          ipAddress: req.ip,
        });
        isNew = true;
      }
    }

    if (!customerService) {
      return res.json({
        error: { code: "NO_ACTIVE_SESSION", message: "No active session" },
      });
    }

    if (isNew) {
      const welcomeMsg = await ChatMessage.create({
        customerService: customerService._id,
        senderModel: "Admin",
        senderId: "admin",
        content: `👋 مرحباً ${customerService.name} إذا كانت لديك أي أسئلة. نحن هنا لمساعدتك!`,
      });
      broadcastNewMessage(welcomeMsg, customerService).catch(() => {});
      broadcastTicketUpdate(customerService, false).catch(() => {});
    }

    res.json(sanitizeCustomerService(customerService));
  } catch (error) {
    next(error);
  }
};

// ── GET /api/support/:id/messages ────────────────────────────────────────────
const getMessages = async (req, res, next) => {
  try {
    const guestId = getGuestId(req);
    const customerService = await CustomerService.findById(req.params.id);
    if (!customerService)
      return res.status(404).json({
        error: {
          code: "CONVERSATION_NOT_FOUND",
          message: "CustomerService not found",
        },
      });

    let isOwner = req.user
      ? String(customerService.user) === String(req.user.id)
      : customerService.guestId === guestId;

    if (
      !isOwner &&
      req.user &&
      customerService.guestId === guestId &&
      !customerService.user
    ) {
      customerService.user = req.user.id;
      customerService.name = req.user.name || customerService.name;
      customerService.email = req.user.email || customerService.email;
      await customerService.save();
      isOwner = true;
    }

    if (!isOwner) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Forbidden" },
      });
    }

    const messages = await ChatMessage.find({
      customerService: customerService._id,
    }).sort("createdAt");

    if (customerService.unreadUser > 0) {
      customerService.unreadUser = 0;
      await customerService.save();
    }

    res.json(messages.map(sanitizeChatMessage));
  } catch (error) {
    next(error);
  }
};

// ── POST /api/support/:id/messages ───────────────────────────────────────────
const sendMessage = async (req, res, next) => {
  try {
    const guestId = getGuestId(req);
    const content = String(req.body?.content || req.body?.text || "").trim();
    if (!content || content.length > 5000) {
      return res.status(400).json({
        error: {
          code: "INVALID_MESSAGE",
          message: "Message must be between 1 and 5000 characters",
        },
      });
    }
    const customerService = await CustomerService.findById(req.params.id);
    if (!customerService)
      return res.status(404).json({
        error: {
          code: "CONVERSATION_NOT_FOUND",
          message: "CustomerService not found",
        },
      });

    let isOwner = req.user
      ? String(customerService.user) === String(req.user.id)
      : customerService.guestId === guestId;

    if (
      !isOwner &&
      req.user &&
      customerService.guestId === guestId &&
      !customerService.user
    ) {
      customerService.user = req.user.id;
      customerService.name = req.user.name || customerService.name;
      customerService.email = req.user.email || customerService.email;
      await customerService.save();
      isOwner = true;
    }

    if (!isOwner) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Forbidden" },
      });
    }

    const senderModel = req.user ? "User" : "Guest";
    const senderId = req.user ? req.user.id : guestId;
    const senderName = req.user
      ? (req.user.name || req.user.username || "العميل")
      : (customerService.name || "زائر");

    const message = await ChatMessage.create({
      customerService: customerService._id,
      senderModel,
      senderId,
      senderName,
      content,
    });

    customerService.lastMessageAt = new Date();
    customerService.unreadAdmin += 1;
    if (customerService.status === "resolved") customerService.status = "open";
    await customerService.save();

    await broadcastNewMessage(message, customerService).catch(() => {});

    res.json(sanitizeChatMessage(message));
  } catch (error) {
    next(error);
  }
};

// ── POST /api/support/internal-event ──────────────────────────────────────────
const handleInternalEvent = async (req, res) => {
  try {
    const secret = req.headers["x-internal-secret"];
    if (!secret || secret !== env.ADMIN_JWT_SECRET) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { type, message, customerService, sysMessage } = req.body;
    const io = getIO();
    if (!io) return res.json({ ok: true });

    const convId = (
      message?.customerService ||
      customerService?._id ||
      sysMessage?.customerService ||
      ""
    ).toString();

    if (type === "newMessage" && message) {
      if (convId) {
        io.to(`customerService_${convId}`).emit("newMessage", message);
        io.to(`ticket_${convId}`).emit("newMessage", message);
        io.to(convId).emit("newMessage", message);
      }

      let userId = customerService?.user;
      let guestId = customerService?.guestId;

      if ((!userId || !guestId) && convId) {
        try {
          const csDoc = await CustomerService.findById(convId).select("user guestId");
          if (csDoc) {
            if (csDoc.user) userId = csDoc.user.toString();
            if (csDoc.guestId) guestId = csDoc.guestId;
          }
        } catch (e) {}
      }

      if (userId) {
        io.to(`user_${userId}`).emit("newMessage", message);
      }
      if (guestId) {
        io.to(`guest_${guestId}`).emit("newMessage", message);
      }
    } else if (type === "statusChanged" && customerService) {
      if (convId) {
        io.to(`customerService_${convId}`).emit("ticketStatusChanged", customerService);
        io.to(`ticket_${convId}`).emit("ticketStatusChanged", customerService);
        io.to(`customerService_${convId}`).emit("customerServiceStatusChanged", customerService);
        if (sysMessage) {
          io.to(`customerService_${convId}`).emit("newMessage", sysMessage);
          io.to(`ticket_${convId}`).emit("newMessage", sysMessage);
          io.to(convId).emit("newMessage", sysMessage);
        }
      }
      if (customerService.user) {
        io.to(`user_${customerService.user}`).emit("ticketStatusChanged", customerService);
      }
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  optionalAuth,
  initCustomerService,
  getMessages,
  sendMessage,
  handleInternalEvent,
};
