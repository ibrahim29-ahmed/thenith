import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import CustomerService from "../models/CustomerService.js";
import ChatMessage from "../models/ChatMessage.js";
import UserNotification from "../models/UserNotification.js";
import User from "../models/User.js";
import _env222 from "../config/env.js";
const { env } = _env222;
import _tokens1677 from "../util/tokens.js";
const { verifyAccessToken } = _tokens1677;
import socketConfig from "../config/socket.js";

let io;

async function initSocket(server) {
  io = new Server(server, socketConfig);

  io.use(async (socket, next) => {
    try {
      const cookies = socket.handshake.headers.cookie
        ? socket.handshake.headers.cookie.split(";").reduce((acc, c) => {
            const [key, val] = c.trim().split("=");
            acc[key] = val;
            return acc;
          }, {})
        : {};

      const token =
        socket.handshake.auth?.token || cookies.access_token || cookies.token;

      if (token) {
        try {
          const payload = verifyAccessToken(token);
          const user = await User.findById(payload.sub);
          if (user) socket.user = user;
        } catch (e) {
          // ignore invalid token
        }
      }



      socket.guestId = socket.handshake.auth?.guestId || "";
      next();
    } catch (e) {
      next(); // never reject socket connection completely
    }
  });

  io.on("connection", (socket) => {
    socket.on("joinCustomerService", (data) => {
      const customerServiceId =
        typeof data === "object" ? data.customerServiceId || data.ticketId : data;
      if (!customerServiceId) return;

      const providedGuestId =
        typeof data === "object" && data.guestId ? data.guestId : null;
      if (providedGuestId) {
        socket.guestId = providedGuestId;
        socket.join(`guest_${providedGuestId}`);
      }

      socket.join(`customerService_${customerServiceId}`);
      socket.join(`ticket_${customerServiceId}`);
      socket.join(String(customerServiceId));
    });

    socket.on("joinTicket", (data) => {
      const customerServiceId = typeof data === "object" ? data.ticketId || data.customerServiceId : data;
      if (!customerServiceId) return;
      socket.join(`customerService_${customerServiceId}`);
      socket.join(`ticket_${customerServiceId}`);
      socket.join(String(customerServiceId));
    });

    if (socket.user?._id) {
      socket.join(`user_${socket.user._id}`);
    }
    if (socket.guestId) {
      socket.join(`guest_${socket.guestId}`);
    }

    socket.on("joinUserRoom", () => {
      if (socket.user?._id) {
        socket.join(`user_${socket.user._id}`);
      }
    });

    socket.on("joinProfileRoom", (data) => {
      const identifier = typeof data === "string" ? data : data?.identifier;
      if (identifier) {
        const cleanId = String(identifier).trim().toLowerCase();
        socket.join(`profile_${cleanId}`);
      }
    });
  });

  try {
    const chatStream = ChatMessage.watch();
    chatStream.on("change", (change) => {
      if (change.operationType === "insert") {
        const message = change.fullDocument;
        const convId = message.customerService
          ? message.customerService.toString()
          : null;
        if (convId) {
          const room = getRoomTarget(io, `customerService_${convId}`);
          room?.emit("newMessage", message);
        }


      }
    });
    chatStream.on("error", (err) => {
      console.error("chatStream error:", err);
    });
  } catch (err) {
  }

  try {
    const convStream = CustomerService.watch([], { fullDocument: "updateLookup" });
    convStream.on("change", async (change) => {

      if (
        change.operationType === "insert" ||
        change.operationType === "update"
      ) {
        const customerService = change.fullDocument;
        if (customerService) {


          // If status changed, emit customerServiceStatusChanged to the specific room
          if (
            change.operationType === "update" &&
            change.updateDescription?.updatedFields?.status
          ) {
            const convId = customerService._id
              ? customerService._id.toString()
              : null;
            if (convId) {
              const room = getRoomTarget(io, `customerService_${convId}`);
              room?.emit("customerServiceStatusChanged", customerService);
              room?.emit("ticketStatusChanged", customerService);
            }
          }
        }
      }
    });
    convStream.on("error", (err) => {
      console.error("convStream error:", err);
    });
  } catch (err) {
  }

  try {
    const notifStream = UserNotification.watch();
    notifStream.on("change", (change) => {
      if (change.operationType === "insert") {
        const notif = change.fullDocument;
        if (notif.type === "admin_push") {
          const room = getRoomTarget(io, `user_${notif.userId}`);
          room?.emit("adminNotification", {
            type: "admin_push",
            title: notif.title,
            message: notif.message,
            notifId: notif._id,
            timestamp: notif.createdAt || new Date().toISOString(),
          });
        }
      }
    });
    notifStream.on("error", (err) => {
      console.error("notifStream error:", err);
    });
  } catch (err) {
  }

  // 4. Real-time sync: Watch Subscriptions (Admin plan change, expirations, renewals)
  try {
    const Subscription = (await import("../models/Subscription.js")).default;
    const _dashNotif = (await import("../util/dashboardNotifications.js")).default;
    const subStream = Subscription.watch([], { fullDocument: "updateLookup" });
    subStream.on("change", (change) => {
      const doc = change.fullDocument;
      const uid = doc?.userId?.toString();
      if (uid) {
        const room = getRoomTarget(io, `user_${uid}`);
        room?.emit("dashboard_update", { type: "subscription_update", payload: doc });
        room?.emit("subscription_update", doc);
        _dashNotif?.notifyUser(uid, { type: "subscription_update", payload: doc });
      }
    });
    subStream.on("error", () => {});
  } catch (err) {}

  // 5. Real-time sync: Watch Users (Admin permissions, verification, role, active card changes)
  try {
    const _dashNotif = (await import("../util/dashboardNotifications.js")).default;
    const userStream = User.watch([], { fullDocument: "updateLookup" });
    userStream.on("change", (change) => {
      const doc = change.fullDocument;
      const uid = (doc?._id || change.documentKey?._id)?.toString();
      if (uid) {
        const room = getRoomTarget(io, `user_${uid}`);
        room?.emit("dashboard_update", { type: "user_update", payload: { userId: uid } });
        room?.emit("user_update", { userId: uid });
        _dashNotif?.notifyUser(uid, { type: "user_update", payload: { userId: uid } });
      }
    });
    userStream.on("error", () => {});
  } catch (err) {}

  // 6. Real-time sync: Watch Cards
  try {
    const Card = (await import("../models/Card.js")).default;
    const _dashNotif = (await import("../util/dashboardNotifications.js")).default;
    const cardStream = Card.watch([], { fullDocument: "updateLookup" });
    cardStream.on("change", (change) => {
      const doc = change.fullDocument;
      const uid = doc?.userId?.toString();
      if (uid) {
        const room = getRoomTarget(io, `user_${uid}`);
        room?.emit("dashboard_update", { type: "card_update", payload: doc });
        room?.emit("card_update", doc);
        _dashNotif?.notifyUser(uid, { type: "card_update", payload: doc });
      }
    });
    cardStream.on("error", () => {});
  } catch (err) {}

  // 7. Real-time sync: Watch Referrals & Rewards & NFC Fulfillments
  try {
    const Referral = (await import("../models/Referral.js")).default;
    const ReferralReward = (await import("../models/ReferralReward.js")).default;
    const ReferralProgramSettings = (await import("../models/ReferralProgramSettings.js")).default;
    const _dashNotif = (await import("../util/dashboardNotifications.js")).default;

    const refStream = Referral.watch([], { fullDocument: "updateLookup" });
    refStream.on("change", (change) => {
      const doc = change.fullDocument;
      const uid = (doc?.referrerId || doc?.inviteeId)?.toString();
      if (uid) {
        const room = getRoomTarget(io, `user_${uid}`);
        room?.emit("dashboard_update", { type: "referral_update" });
        room?.emit("referral_update", doc);
        _dashNotif?.notifyUser(uid, { type: "referral_update", payload: doc });
      }
    });
    refStream.on("error", () => {});

    const rewardStream = ReferralReward.watch([], { fullDocument: "updateLookup" });
    rewardStream.on("change", (change) => {
      const doc = change.fullDocument;
      const uid = doc?.userId?.toString();
      if (uid) {
        const room = getRoomTarget(io, `user_${uid}`);
        room?.emit("dashboard_update", { type: "referral_update" });
        room?.emit("referral_update", doc);
        _dashNotif?.notifyUser(uid, { type: "referral_update", payload: doc });
      }
    });
    rewardStream.on("error", () => {});

    const refSettingsStream = ReferralProgramSettings.watch([], { fullDocument: "updateLookup" });
    refSettingsStream.on("change", () => {
      io?.emit("referrals_update", { type: "settings_changed" });
      io?.emit("dashboard_update", { type: "referrals_update" });
    });
    refSettingsStream.on("error", () => {});
  } catch (err) {}

  // 8. Real-time sync: Watch Plans, Coupons, System Settings (Instant broadcast across all panels)
  try {
    const Plan = (await import("../models/Plan.js")).default;
    const Coupon = (await import("../models/Coupon.js")).default;
    const Setting = (await import("../models/Setting.js")).default;
    const subscriptionService = (await import("./subscriptionService.js")).default || await import("./subscriptionService.js");

    const planStream = Plan.watch([], { fullDocument: "updateLookup" });
    planStream.on("change", () => {
      if (typeof subscriptionService?.invalidateFreePlanCache === "function") {
        subscriptionService.invalidateFreePlanCache();
      }
      io?.emit("plans_update", { type: "plans_changed" });
      io?.emit("dashboard_update", { type: "plans_update" });
    });
    planStream.on("error", () => {});

    const couponStream = Coupon.watch([], { fullDocument: "updateLookup" });
    couponStream.on("change", () => {
      io?.emit("plans_update", { type: "coupons_changed" });
      io?.emit("dashboard_update", { type: "plans_update" });
    });
    couponStream.on("error", () => {});

    const settingsStream = Setting.watch([], { fullDocument: "updateLookup" });
    settingsStream.on("change", () => {
      io?.emit("system_settings_update", { type: "settings_changed" });
      io?.emit("dashboard_update", { type: "system_update" });
    });
    settingsStream.on("error", () => {});
  } catch (err) {}

  // 9. Real-time sync: Watch Products (When product is deleted or added in admin, broadcast immediately)
  try {
    const Product = (await import("../models/Product.js")).default;
    const productController = await import("../controller/productController.js");
    const productStream = Product.watch([], { fullDocument: "updateLookup" });
    productStream.on("change", (change) => {
      if (typeof productController?.invalidateProductsCache === "function") {
        productController.invalidateProductsCache();
      }
      io?.emit("products_update", { type: change.operationType, productId: change.documentKey?._id });
      io?.emit("dashboard_update", { type: "products_update" });
    });
    productStream.on("error", () => {});
  } catch (err) {}

  return io;
}

function getIO() {
  return io;
}

function getRoomTarget(server, room) {
  if (!server) return null;
  if (typeof server.to === "function") return server.to(room);
  if (server.sockets && typeof server.sockets.to === "function") {
    return server.sockets.to(room);
  }
  return null;
}

export { getIO, getRoomTarget };

export default {
  initSocket,
  getIO,
  getRoomTarget,
};
