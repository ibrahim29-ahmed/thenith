import http from "http";
import app from "./app.js";
import _database from "./config/database.js";
import _env from "./config/env.js";
import _socketService from "./services/socketService.js";
import { setIO } from "./middleware/securityAudit.js";

const { connectDatabase } = _database;
const { env, clientOrigins } = _env;
const { initSocket } = _socketService;

// Make allowed origins available globally for isExternal detection in middleware
global._allowedOrigins = clientOrigins;

const server = http.createServer(app);
const ioInstance = await initSocket(server);
setIO(ioInstance);

import { startAuditLogWatcher } from "./services/auditWatcher.js";
import { startSubscriptionExpiryJob } from "./jobs/expireSubscriptions.job.js";

try {
  await connectDatabase();
  startAuditLogWatcher();
  startSubscriptionExpiryJob();

  server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`Admin Server running on port ${env.PORT} (0.0.0.0)`);
  });

  const shutdown = async (signal) => {
    await new Promise((resolve) => server.close(resolve));
    process.exit(0);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
} catch (error) {
  console.error("Fatal startup error in DASH backend:", error);
  process.exit(1);
}
