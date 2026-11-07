import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import _asyncHandler4281 from "../util/asyncHandler.js";
const { asyncHandler } = _asyncHandler4281;
import _env7447 from "../config/env.js";
const { env } = _env7447;
import cloudinary from "../config/cloudinary.js";
import { uploadToCloudinary } from "../services/uploadService.js";
import _entitlements from "../util/entitlements.js";
const { canAccess } = _entitlements;

const __uploadFilename = fileURLToPath(import.meta.url);
const __uploadDirname = path.dirname(__uploadFilename);
const SITE_PUBLIC_UPLOADS = path.resolve(__uploadDirname, "../../../FRONTEND/public/uploads");
const BACKEND_PUBLIC_UPLOADS = path.resolve(__uploadDirname, "../../public/uploads");

// POST /api/upload/base64?field=avatar|cover|paymentAvatar|paymentCover
const uploadBase64 = asyncHandler(async (req, res) => {
  const field = req.query.field || req.body?.field;
  const imageData = req.body?.imageData || req.body?.image;

  const validFields = ["avatar", "cover", "paymentAvatar", "paymentCover"];
  if (!validFields.includes(field)) {
    return res.status(400).json({ message: "Invalid field" });
  }
  if (field === "cover" && !canAccess(req.subscription?.entitlements, "coverImage")) {
    return res.status(403).json({ message: "Cover image is available on the Pro plan" });
  }
  if (!imageData) {
    return res.status(400).json({ message: "No image data provided" });
  }

  let base64 = String(imageData);
  const dataUriMatch = base64.match(/^data:(image\/[a-zA-Z+.-]+);base64,/);
  if (base64.startsWith("data:") && !dataUriMatch) {
    return res.status(400).json({ message: "Only image files are supported" });
  }
  if (dataUriMatch) {
    base64 = base64.slice(dataUriMatch[0].length);
  }

  const cleanBase64 = base64.trim().replace(/\s+/g, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  if (!buffer.length || buffer.length > 10 * 1024 * 1024) {
    return res.status(400).json({ message: "Image must be between 1 byte and 10 MB" });
  }

  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isWebp = buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  const isGif = buffer.length >= 4 && buffer.toString("ascii", 0, 3) === "GIF";

  if (!isJpeg && !isPng && !isWebp && !isGif) {
    return res.status(400).json({ message: "Only valid image files (JPEG, PNG, WebP, GIF) are supported" });
  }

  let ext = "png";
  if (isJpeg) ext = "jpg";
  else if (isWebp) ext = "webp";
  else if (isGif) ext = "gif";

  try {
    const userId = req.user._id.toString();
    const folder = field === "cover" || field === "paymentCover" ? "thenith/covers" : "thenith/avatars";
    const fullPublicId = field.startsWith("payment")
      ? `${folder}/${userId}_${field}_${Date.now()}`
      : `${folder}/${userId}`;

    // 1. Try Cloudinary if configured
    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      try {
        const uploader = cloudinary?.uploader || cloudinary?.default?.uploader;
        if (uploader && !field.startsWith("payment")) {
          await uploader.destroy(fullPublicId, { invalidate: true }).catch(() => {});
        }
        const result = await uploadToCloudinary(buffer, folder, userId);
        if (field === "cover") {
          req.user.coverImage = result.secure_url;
          await req.user.save();
        } else if (field === "avatar") {
          req.user.avatar = result.secure_url;
          await req.user.save();
        }
        return res.json({ url: result.secure_url });
      } catch (cloudErr) {
        console.warn("Cloudinary upload failed, falling back to local storage:", cloudErr.message);
      }
    }

    // 2. Seamless local fallback
    if (!fs.existsSync(SITE_PUBLIC_UPLOADS)) {
      fs.mkdirSync(SITE_PUBLIC_UPLOADS, { recursive: true });
    }
    if (!fs.existsSync(BACKEND_PUBLIC_UPLOADS)) {
      fs.mkdirSync(BACKEND_PUBLIC_UPLOADS, { recursive: true });
    }

    const filename = `${field}_${userId}_${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(SITE_PUBLIC_UPLOADS, filename), buffer);
    try {
      fs.writeFileSync(path.join(BACKEND_PUBLIC_UPLOADS, filename), buffer);
    } catch {}

    const fileUrl = `/uploads/${filename}`;
    if (field === "cover") {
      req.user.coverImage = fileUrl;
      await req.user.save();
    } else if (field === "avatar") {
      req.user.avatar = fileUrl;
      await req.user.save();
    }
    return res.json({ url: fileUrl });
  } catch (e) {
    res.status(502).json({ message: e.message || "Upload failed" });
  }
});

export default { uploadBase64 };
