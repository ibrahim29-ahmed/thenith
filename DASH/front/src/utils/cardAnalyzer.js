/**
 * Smart Card Visual Layout & Element Analyzer
 * Analyzes uploaded card image(s) via Canvas to detect:
 * 1. Background palette & luminance (Dark / Light / Accent)
 * 2. High-contrast text & logo zones
 * 3. Text coordinates (Name, Job Title)
 * 4. Logo / Graphic elements coordinates
 * 5. QR Code & Back side title/subtitle coordinates
 */

function rgbToHex(r, g, b) {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getLuminance(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Analyzes a single card face (front or back)
 */
function analyzeSingleFace(img, isBack = false) {
  if (!img) return null;

  const width = 600;
  const height = Math.round(width / 1.586); // CR80 aspect ratio (~378px)

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Detect dominant background by sampling borders & corners
  const samplePoints = [
    { x: 15, y: 15 },
    { x: width - 15, y: 15 },
    { x: 15, y: height - 15 },
    { x: width - 15, y: height - 15 },
    { x: Math.round(width / 2), y: 15 },
    { x: 15, y: Math.round(height / 2) },
    { x: width - 15, y: Math.round(height / 2) },
    { x: Math.round(width / 2), y: height - 15 },
  ];

  let rSum = 0, gSum = 0, bSum = 0;
  for (const pt of samplePoints) {
    const idx = (pt.y * width + pt.x) * 4;
    rSum += data[idx];
    gSum += data[idx + 1];
    bSum += data[idx + 2];
  }

  const bgR = Math.round(rSum / samplePoints.length);
  const bgG = Math.round(gSum / samplePoints.length);
  const bgB = Math.round(bSum / samplePoints.length);
  const bgLuminance = getLuminance(bgR, bgG, bgB);
  const isDark = bgLuminance < 0.55;
  const dominantBgColor = rgbToHex(bgR, bgG, bgB);

  // Suggested text & contrast colors
  let textColor = isDark ? "#ffffff" : "#0f172a";
  let jobColor = isDark ? "#94a3b8" : "#475569";
  let qrColor = isDark ? "#ffffff" : "#000000";

  // Check for gold or warm luxury accents in the card
  let warmPixelCount = 0;
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > 160 && g > 130 && b < 100) warmPixelCount++;
  }
  const hasGoldAccent = warmPixelCount > (data.length / 16) * 0.04;
  if (isDark && hasGoldAccent) {
    textColor = "#d4af37"; // Metallic gold
  }

  // 2. Grid-based contrast analysis to detect feature clusters (Logo, Text, QR)
  const cols = 20;
  const rows = 12;
  const cellW = width / cols;
  const cellH = height / rows;
  const energyGrid = [];

  for (let r = 0; r < rows; r++) {
    energyGrid[r] = [];
    for (let c = 0; c < cols; c++) {
      let diffSum = 0;
      let count = 0;
      for (let y = Math.floor(r * cellH); y < Math.floor((r + 1) * cellH); y += 3) {
        for (let x = Math.floor(c * cellW); x < Math.floor((c + 1) * cellW); x += 3) {
          const idx = (y * width + x) * 4;
          const diff = colorDistance(data[idx], data[idx + 1], data[idx + 2], bgR, bgG, bgB);
          diffSum += diff;
          count++;
        }
      }
      energyGrid[r][c] = count > 0 ? diffSum / count : 0;
    }
  }

  // Find high-contrast centers in specific quadrants
  function findCentroidInBox(cStart, cEnd, rStart, rEnd) {
    let totalWeight = 0;
    let sumX = 0;
    let sumY = 0;

    for (let r = rStart; r <= rEnd; r++) {
      for (let c = cStart; c <= cEnd; c++) {
        const weight = Math.max(0, energyGrid[r][c] - 25);
        if (weight > 0) {
          totalWeight += weight;
          sumX += ((c + 0.5) / cols) * 100 * weight;
          sumY += ((r + 0.5) / rows) * 100 * weight;
        }
      }
    }

    if (totalWeight < 10) return null;
    return {
      x: Math.round(Math.max(8, Math.min(92, sumX / totalWeight))),
      y: Math.round(Math.max(8, Math.min(92, sumY / totalWeight))),
      density: totalWeight,
    };
  }

  if (!isBack) {
    // ── FRONT FACE DETECTION ──
    // 1. Logo detection: Check Top-Right (cols 13-19, rows 0-4) and Top-Left (cols 0-6, rows 0-4)
    const logoTopRight = findCentroidInBox(13, 19, 0, 4);
    const logoTopLeft = findCentroidInBox(0, 6, 0, 4);
    const logoCenter = findCentroidInBox(6, 13, 0, 4);

    let logoPos = { x: 84, y: 18 };
    let hasLogo = false;

    if (logoTopRight && (!logoTopLeft || logoTopRight.density >= logoTopLeft.density)) {
      logoPos = { x: logoTopRight.x, y: logoTopRight.y };
      hasLogo = true;
    } else if (logoTopLeft) {
      logoPos = { x: logoTopLeft.x, y: logoTopLeft.y };
      hasLogo = true;
    } else if (logoCenter) {
      logoPos = { x: logoCenter.x, y: logoCenter.y };
      hasLogo = true;
    }

    // 2. Name & Job detection: Check Mid-Left & Mid-Center (rows 4-10)
    const midCenter = findCentroidInBox(3, 16, 4, 8);
    const midLower = findCentroidInBox(3, 16, 7, 10);

    let namePos = { x: 50, y: 50 };
    let jobPos = { x: 50, y: 64 };
    let textAlign = "center";

    if (midCenter) {
      namePos = { x: midCenter.x, y: midCenter.y };
      if (midCenter.x < 38) textAlign = "left";
      else if (midCenter.x > 62) textAlign = "right";
      else textAlign = "center";

      if (midLower && Math.abs(midLower.y - midCenter.y) > 8) {
        jobPos = { x: midCenter.x, y: Math.min(88, midLower.y) };
      } else {
        jobPos = { x: midCenter.x, y: Math.min(88, midCenter.y + 14) };
      }
    }

    return {
      dominantBgColor,
      isDark,
      textColor,
      jobColor,
      textAlign,
      positions: {
        name: namePos,
        job: jobPos,
        logo: logoPos,
        logo2: { x: logoPos.x > 50 ? 16 : 84, y: 18 },
        tap: { x: 20, y: 88 },
      },
      visibility: {
        name: true,
        job: true,
        logo: hasLogo,
        logo2: false,
        brand: false,
        tap: false,
      },
      sizes: {
        nameSize: 24,
        jobSize: 13,
        logoSize: 55,
      },
    };
  } else {
    // ── BACK FACE DETECTION ──
    // Detect QR code: typically in Right Side (cols 12-19) or Center (cols 7-13)
    const rightZone = findCentroidInBox(12, 19, 2, 9);
    const centerZone = findCentroidInBox(6, 13, 2, 9);
    const leftZone = findCentroidInBox(0, 7, 2, 9);

    let qrPos = { x: 75, y: 50 };
    let backTitlePos = { x: 28, y: 22 };
    let backSubtitlePos = { x: 28, y: 80 };

    if (rightZone && rightZone.density > (centerZone?.density || 0) * 0.8) {
      qrPos = { x: rightZone.x, y: rightZone.y };
      backTitlePos = { x: 28, y: 24 };
      backSubtitlePos = { x: 28, y: 80 };
    } else if (centerZone) {
      qrPos = { x: centerZone.x, y: centerZone.y };
      backTitlePos = { x: 50, y: 18 };
      backSubtitlePos = { x: 50, y: 84 };
    } else if (leftZone) {
      qrPos = { x: leftZone.x, y: leftZone.y };
      backTitlePos = { x: 72, y: 24 };
      backSubtitlePos = { x: 72, y: 80 };
    }

    return {
      dominantBgColor,
      isDark,
      textColor,
      qrColor,
      positions: {
        backQr: qrPos,
        backTitle: backTitlePos,
        backSubtitle: backSubtitlePos,
        backLogo: { x: 20, y: 65 },
        backLogo2: { x: 50, y: 65 },
      },
      visibility: {
        backTitle: true,
        backSubtitle: true,
        backQr: true,
        backLogo: false,
        backLogo2: false,
      },
      sizes: {
        backQrSize: 88,
        backTitleSize: 13,
        backSubtitleSize: 12,
      },
    };
  }
}

/**
 * Main export: Analyzes front and back images and generates
 * a complete config ready to be injected as the default studio layout.
 */
export async function analyzeCardImages(frontDataUrl, backDataUrl) {
  try {
    const [frontImg, backImg] = await Promise.all([
      loadImage(frontDataUrl),
      loadImage(backDataUrl),
    ]);

    if (!frontImg && !backImg) {
      throw new Error("يرجى رفع صورة الكارت الأمامي أو الخلفي أولاً للبدء بالتحليل.");
    }

    const frontAnalysis = frontImg ? analyzeSingleFace(frontImg, false) : null;
    const backAnalysis = backImg ? analyzeSingleFace(backImg, true) : null;

    // Combine into positions & visibilities
    const combinedPositions = {
      ...(frontAnalysis?.positions || {}),
      ...(backAnalysis?.positions || {}),
    };

    const combinedVisibility = {
      ...(frontAnalysis?.visibility || {}),
      ...(backAnalysis?.visibility || {}),
    };

    // Construct human-readable summary
    const summaryParts = [];
    if (frontAnalysis) {
      summaryParts.push(
        `الوجه الأمامي: تم اكتشاف خلفية ${frontAnalysis.isDark ? "داكنة" : "فاتحة"} (${frontAnalysis.dominantBgColor})، وضبط موضع الاسم (${frontAnalysis.positions.name.x}%, ${frontAnalysis.positions.name.y}%)، المسمى الوظيفي، وموضع الشعار.`
      );
    }
    if (backAnalysis) {
      summaryParts.push(
        `الوجه الخلفي: تم اكتشاف موضع رمز الـ QR (${backAnalysis.positions.backQr.x}%, ${backAnalysis.positions.backQr.y}%)، والعناوين.`
      );
    }

    return {
      success: true,
      front: frontAnalysis,
      back: backAnalysis,
      combinedPositions,
      combinedVisibility,
      dominantBgColor: frontAnalysis?.dominantBgColor || backAnalysis?.dominantBgColor || "#0f172a",
      nameColor: frontAnalysis?.textColor || "#ffffff",
      jobColor: frontAnalysis?.jobColor || "#94a3b8",
      backTitleColor: backAnalysis?.textColor || "#ffffff",
      backSubtitleColor: backAnalysis?.jobColor || "#94a3b8",
      qrColor: backAnalysis?.qrColor || "#000000",
      textAlign: frontAnalysis?.textAlign || "center",
      summary: summaryParts.join("\n"),
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || "حدث خطأ أثناء فحص الصورة.",
    };
  }
}

