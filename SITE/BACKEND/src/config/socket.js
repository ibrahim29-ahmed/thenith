import _env from "./env.js";
import { corsOptions } from "./cors.js";

const { env } = _env;

export const socketConfig = {
  cors: {
    origin: corsOptions.origin,
    credentials: true,
  },
  pingTimeout: env.SOCKET_PING_TIMEOUT || 60000,
  pingInterval: env.SOCKET_PING_INTERVAL || 25000,
  maxHttpBufferSize: env.SOCKET_MAX_HTTP_BUFFER_SIZE || 1e6, // 1MB
  path: env.SOCKET_PATH || "/socket.io",
};

export default socketConfig;
