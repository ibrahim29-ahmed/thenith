import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4001),
  APP_URL: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().default("http://localhost:3000"),
  ),
  SITE_URL: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().default("http://localhost:3000"),
  ),
  CLIENT_ORIGIN: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().default("http://localhost:5173,http://localhost:3000"),
  ),
  MONGODB_URI: z.string().min(1),
  MONGODB_DNS_SERVERS: z.string().default(""),
  ADMIN_USERNAME: z.string().min(1).default("admin"),
  ADMIN_PASSWORD: z.string().min(1),
  ADMIN_JWT_SECRET: z.string().min(16),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16)
    .default("dev_access_7f3b9d2a1c8e4f6b0a5d9c2e7b1f8a4d6c3e0f9b2a7d5c1e8"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  CLOUDINARY_CLOUD_NAME: z.string().default(""),
  CLOUDINARY_API_KEY: z.string().default(""),
  CLOUDINARY_API_SECRET: z.string().default(""),
  FAWATERAK_ENV: z.string().default("test"),
  FAWATERAK_CLIENT_ID: z.string().default(""),
  FAWATERAK_CLIENT_SECRET: z.string().default(""),
  FAWATERAK_API_KEY: z.string().default(""),
  FAWATERAK_BASE_URL: z.string().default("https://staging.fawaterk.com"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Invalid Admin Dashboard environment configuration:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

const env = parsed.data;

const clientOrigins = (env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export default {
  env,
  clientOrigins,
};
