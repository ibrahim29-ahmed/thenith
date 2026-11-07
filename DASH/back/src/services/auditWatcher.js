import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";
import _socketService from "./socketService.js";

const recentEmittedIds = new Set();

function markEmitted(id) {
  const strId = String(id);
  recentEmittedIds.add(strId);
  setTimeout(() => {
    recentEmittedIds.delete(strId);
  }, 10000);
}

export function isRecentlyEmitted(id) {
  return recentEmittedIds.has(String(id));
}

export function startAuditLogWatcher() {
  let isWatching = false;

  const initWatcher = () => {
    if (isWatching) return;
    try {
      const changeStream = AuditLog.watch(
        [{ $match: { operationType: "insert" } }],
        { fullDocument: "updateLookup" }
      );

      isWatching = true;

      changeStream.on("change", async (change) => {
        try {
          const fullDoc = change.fullDocument;
          if (!fullDoc || !fullDoc._id) return;

          const docId = String(fullDoc._id);
          if (recentEmittedIds.has(docId)) {
            return;
          }
          markEmitted(docId);

          let populatedDoc = { ...fullDoc };

          if (fullDoc.userId) {
            try {
              const user = await User.findById(fullDoc.userId)
                .select(
                  "name email phone username role publicId address avatar isActive isEmailVerified createdAt"
                )
                .lean();
              if (user) {
                populatedDoc.userId = user;
              }
            } catch {}
          }

          const io = _socketService.getIO();
          if (io) {
            io.to("admin_room").emit("newAuditLog", populatedDoc);
          }
        } catch (err) {
          // Silent
        }
      });

      changeStream.on("error", () => {
        isWatching = false;
        try {
          changeStream.close();
        } catch {}
        setTimeout(initWatcher, 5000);
      });

      changeStream.on("close", () => {
        isWatching = false;
        setTimeout(initWatcher, 5000);
      });
    } catch (err) {
      isWatching = false;
      setTimeout(initWatcher, 10000);
    }
  };

  initWatcher();
}

export default { startAuditLogWatcher, markEmitted, isRecentlyEmitted };
