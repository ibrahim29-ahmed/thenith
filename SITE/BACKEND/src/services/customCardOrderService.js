import mongoose from "mongoose";
import axios from "axios";
import sharp from "sharp";
import QRCode from "qrcode";
import PhysicalCard, { generateInternalCardId, generateCardPassword6 } from "../models/PhysicalCard.js";
import Product from "../models/Product.js";
import _idGenerator from "../util/idGenerator.js";
import _env from "../config/env.js";
import { uploadToCloudinary } from "./uploadService.js";

const { generatePublicId } = _idGenerator;
const { env } = _env;

/**
 * Downloads or decodes an image into a Buffer from either a remote URL or a base64 Data URI.
 */
async function getImageBuffer(imageSource) {
  if (!imageSource || typeof imageSource !== "string") return null;

  if (imageSource.startsWith("data:image")) {
    const base64Data = imageSource.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(base64Data, "base64");
  }

  if (imageSource.startsWith("http://") || imageSource.startsWith("https://")) {
    const resp = await axios.get(imageSource, {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: {
        "User-Agent": "ThenithServer/1.0",
      },
    });
    return Buffer.from(resp.data);
  }

  return null;
}

/**
 * Automatically creates and links physical smart cards for custom card items in an order.
 * Ensures the generated card appears in Thenith Smart Cards Management (physical_cards),
 * and replaces the QR code directly inside the card back design image itself at the exact
 * position, size, padding, border radius, and color chosen by the user without any distortion.
 */
export async function processCustomCardsForOrder(order) {
  if (!order || !Array.isArray(order.items)) return false;

  const baseUrl = env?.APP_URL ? env.APP_URL.replace(/\/+$/, "") : "https://thenith.com";
  let modified = false;

  // Fetch ordering user details if available for profile targeting
  let user = null;
  if (order.userId) {
    try {
      user = await mongoose.model("User").findById(order.userId).select("username publicId");
    } catch (e) {
      console.warn("[customCardOrderService] Could not fetch user:", e);
    }
  }

  for (const item of order.items) {
    // If standard product without customDesign (e.g. smart card with selected color from store)
    if (!item.customDesign) {
      try {
        const qty = Math.max(1, item.quantity || 1);
        item.generatedCards = Array.isArray(item.generatedCards) ? item.generatedCards : [];

        if (item.generatedCards.length < qty) {
          let product = null;
          if (item.productId) {
            try {
              product = await Product.findById(item.productId);
            } catch (pErr) {
              console.warn("[customCardOrderService] Product lookup error:", pErr?.message);
            }
          }

          const colorName = item.color?.name?.ar || item.color?.name?.en || item.color?.name || item.color?.colorCode || "black";
          const needed = qty - item.generatedCards.length;

          for (let i = 0; i < needed; i++) {
            let cardId = generateInternalCardId();
            let publicId = generatePublicId();
            let attempts = 0;
            while (attempts < 10) {
              const existing = await PhysicalCard.findOne({ $or: [{ cardId }, { publicId }] });
              if (!existing) break;
              cardId = generateInternalCardId();
              publicId = generatePublicId();
              attempts++;
            }

            const cardPassword = generateCardPassword6();
            const targetUrl = user
              ? `${baseUrl}/p/${user.username || user.publicId}`
              : `${baseUrl}/c/${publicId}`;

            const physicalCard = await PhysicalCard.create({
              cardId,
              publicId,
              cardPassword,
              targetUrl,
              cardType: product?.material === "metal" ? "metal" : product?.material === "wood" ? "bamboo" : "standard",
              productType: product?.category || "card",
              nfcChipType: product?.nfcChipType || "NTAG215",
              color: colorName,
              orderId: order._id,
              orderNumber: order.orderNumber,
              orderColor: item.color || null,
              productName: typeof item.name === 'object' ? (item.name.ar || item.name.en || '') : String(item.name || ''),
              distributionType: "sale",
              status: order.userId ? "claimed" : "unclaimed",
              userId: order.userId || null,
              manufacturedAt: new Date(),
              claimedAt: order.userId ? new Date() : null,
            });

            item.generatedCards.push({
              physicalCardId: physicalCard._id,
              cardId: physicalCard.cardId,
              publicId: physicalCard.publicId,
              cardPassword: physicalCard.cardPassword,
              cardUrl: `${baseUrl}/c/${physicalCard.publicId}`,
              color: item.color || null,
              createdAt: new Date(),
            });
            modified = true;
          }
        }
      } catch (stdErr) {
        console.error("[customCardOrderService] Error generating cards for standard order item:", stdErr);
      }
      continue;
    }

    // Skip if already generated and QR already replaced
    if (
      item.customDesign.generatedCard &&
      item.customDesign.generatedCard.cardId &&
      item.customDesign.qrReplacedInDesign
    ) {
      continue;
    }

    try {
      // 1. Generate unique internal IDs and credentials
      let cardId = item.customDesign.generatedCard?.cardId || generateInternalCardId();
      let publicId = item.customDesign.generatedCard?.publicId || generatePublicId();

      let physicalCard = null;
      if (item.customDesign.generatedCard?.physicalCardId) {
        physicalCard = await PhysicalCard.findById(item.customDesign.generatedCard.physicalCardId);
      }

      if (!physicalCard) {
        let attempts = 0;
        while (attempts < 10) {
          const existing = await PhysicalCard.findOne({ $or: [{ cardId }, { publicId }] });
          if (!existing) break;
          cardId = generateInternalCardId();
          publicId = generatePublicId();
          attempts++;
        }

        const cardPassword = generateCardPassword6();
        const targetUrl = user
          ? `${baseUrl}/p/${user.username || user.publicId}`
          : `${baseUrl}/p/preview`;

        const colorName = item.color?.name?.ar || item.color?.name?.en || item.color?.name || item.color?.colorCode || "custom";

        // 2. Create official record in Thenith Smart Cards Management (physical_cards collection)
        physicalCard = await PhysicalCard.create({
          cardId,
          publicId,
          cardPassword,
          targetUrl,
          cardType: "custom",
          color: colorName,
          orderId: order._id,
          orderNumber: order.orderNumber,
          orderColor: item.color || null,
          productName: typeof item.name === 'object' ? (item.name.ar || item.name.en || 'كارت مخصص') : String(item.name || 'كارت مخصص'),
          distributionType: "sale",
          status: "claimed",
          userId: order.userId || null,
          manufacturedAt: new Date(),
          claimedAt: new Date(),
        });
      }

      const realCardUrl = `${baseUrl}/c/${physicalCard.publicId}`;

      // 3. Extract exact design specifications chosen by the user
      const qrColor = item.customDesign.qrColor || item.customDesign.qrConfig?.color || "#000000";
      const qrPos = item.customDesign.qrPosition || item.customDesign.qrConfig?.position || { x: 75, y: 50 };
      const qrSize = item.customDesign.qrSize || item.customDesign.qrConfig?.size || 88;

      // 4. Generate standalone high-res QR Code (data URL)
      let qrCodeDataUrl = null;
      try {
        qrCodeDataUrl = await QRCode.toDataURL(realCardUrl, {
          color: {
            dark: qrColor,
            light: "#00000000",
          },
          width: 512,
          margin: 0,
        });
      } catch (qrErr) {
        console.warn("[customCardOrderService] QR standalone generation warning:", qrErr);
      }

      // 5. Replace the QR Code DIRECTLY INSIDE the card design image (backImage)
      // Preserving the EXACT SAME dimensions, container, soft rounded corners, padding, and crisp edges
      const targetImageToUpdate = item.customDesign.backImage || item.customDesign.image;
      if (targetImageToUpdate) {
        try {
          const baseImgBuffer = await getImageBuffer(targetImageToUpdate);
          if (baseImgBuffer) {
            const metadata = await sharp(baseImgBuffer).metadata();
            const width = metadata.width || 1063;
            const height = metadata.height || 709;

            // Check if client provided exact qrExportBox coordinates
            const exportBox = item.customDesign.qrExportBox;
            const scale = width / 470;
            const boxSize = exportBox?.boxSize || Math.round(104 * scale);
            const borderRadius = exportBox?.borderRadius || Math.round(14 * scale);
            const padding = exportBox?.padding || Math.round(10 * scale);
            const innerSize = exportBox?.innerSize || Math.max(20, boxSize - padding * 2);

            const posX = typeof qrPos.x === "number" ? qrPos.x : 75;
            const posY = typeof qrPos.y === "number" ? qrPos.y : 50;

            let boxX = typeof exportBox?.boxX === "number" ? exportBox.boxX : Math.round((posX / 100) * width - boxSize / 2);
            let boxY = typeof exportBox?.boxY === "number" ? exportBox.boxY : Math.round((posY / 100) * height - boxSize / 2);

            if (boxX < 0) boxX = 0;
            if (boxY < 0) boxY = 0;
            if (boxX + boxSize > width) boxX = width - boxSize;
            if (boxY + boxSize > height) boxY = height - boxSize;

            // Generate high-resolution pure square module QR buffer (no SVG stroke notches or triangular artifacts)
            const qrPngHighRes = await QRCode.toBuffer(realCardUrl, {
              width: 1024,
              margin: 0,
              errorCorrectionLevel: "H",
              color: {
                dark: qrColor,
                light: "#ffffff",
              },
            });

            const qrResized = await sharp(qrPngHighRes)
              .resize(innerSize, innerSize, { kernel: sharp.kernel.nearest })
              .png()
              .toBuffer();

            // Smooth white rounded container
            const whiteBoxSvg = Buffer.from(
              `<svg width="${boxSize}" height="${boxSize}" xmlns="http://www.w3.org/2000/svg">
                <rect width="${boxSize}" height="${boxSize}" rx="${borderRadius}" ry="${borderRadius}" fill="#ffffff" />
              </svg>`
            );

            // Composite crisp QR inside smooth white container
            const qrContainerBuffer = await sharp(whiteBoxSvg)
              .composite([{ input: qrResized, top: padding, left: padding }])
              .png()
              .toBuffer();

            // Composite directly onto the card design image
            const updatedCardBuffer = await sharp(baseImgBuffer)
              .composite([{ input: qrContainerBuffer, top: boxY, left: boxX }])
              .png()
              .toBuffer();

            // Upload updated card design image to Cloudinary
            let finalCardImageUrl = null;
            try {
              const uploadRes = await uploadToCloudinary(
                updatedCardBuffer,
                "thenith/custom_card_orders",
                `card_back_order_${order._id || order.orderId || "tx"}_${physicalCard.cardId}_final`
              );
              if (uploadRes && (uploadRes.secure_url || uploadRes.url)) {
                finalCardImageUrl = uploadRes.secure_url || uploadRes.url;
              }
            } catch (upErr) {
              console.warn("[customCardOrderService] Cloudinary re-upload warning:", upErr?.message);
            }

            if (!finalCardImageUrl) {
              finalCardImageUrl = `data:image/png;base64,${updatedCardBuffer.toString("base64")}`;
            }

            // OVERWRITE design image with the updated design containing the new QR code
            if (item.customDesign.backImage) {
              item.customDesign.backImage = finalCardImageUrl;
            } else {
              item.customDesign.image = finalCardImageUrl;
            }
            item.customDesign.qrReplacedInDesign = true;
          }
        } catch (compositeErr) {
          console.error("[customCardOrderService] Error replacing QR in card image:", compositeErr);
        }
      }

      // 6. Attach generated smart card info to the order item customDesign
      item.customDesign.generatedCard = {
        physicalCardId: physicalCard._id,
        cardId: physicalCard.cardId,
        publicId: physicalCard.publicId,
        cardPassword: physicalCard.cardPassword,
        cardUrl: realCardUrl,
        qrCodeUrl: realCardUrl,
        qrCodeDataUrl,
        qrColor,
        qrPosition: qrPos,
        qrSize,
        qrReplacedInDesign: Boolean(item.customDesign.qrReplacedInDesign),
        generatedAt: new Date(),
      };

      item.generatedCards = [
        {
          physicalCardId: physicalCard._id,
          cardId: physicalCard.cardId,
          publicId: physicalCard.publicId,
          cardPassword: physicalCard.cardPassword,
          cardUrl: realCardUrl,
          color: item.color || null,
          createdAt: new Date(),
        },
      ];

      modified = true;
    } catch (itemErr) {
      console.error("[customCardOrderService] Error processing custom card for order item:", itemErr);
    }
  }

  if (modified) {
    order.markModified("items");
    await order.save();
  }

  return modified;
}
