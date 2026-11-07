import mongoose from "mongoose";
import _env9406 from "./env.js";
const { env } = _env9406;
import dns from "node:dns";

async function connectDatabase(maxRetries = 5, retryDelayMs = 3000) {
  if (env.MONGODB_DNS_SERVERS) {
    try {
      const servers = env.MONGODB_DNS_SERVERS.split(",")
        .map((server) => server.trim())
        .filter(Boolean);
      if (servers.length > 0) {
        dns.setServers(servers);
      }
    } catch (err) {
      console.warn("Could not set custom DNS servers:", err.message);
    }
  }

  mongoose.set("strictQuery", true);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        maxPoolSize: 50,
        minPoolSize: 1,
        maxIdleTimeMS: 60000,
      });
      console.log(`🚀 Successfully connected to MongoDB Database`);
      return;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(`Retrying MongoDB connection in ${retryDelayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
}

export default { connectDatabase };
