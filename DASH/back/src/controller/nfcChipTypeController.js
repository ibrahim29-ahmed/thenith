import NfcChipType from "../models/NfcChipType.js";

const DEFAULT_CHIP_TYPES = [
  {
    name: "NTAG215",
    title: "NXP NTAG215 (الافتراضي)",
    memorySize: "504 بايت",
    description: "الشريحة القياسية الأكثر توافقاً واستقراراً مع كافة هواتف iPhone وAndroid الذكية.",
    isActive: true,
    isDefault: true,
  },
  {
    name: "NTAG213",
    title: "NXP NTAG213",
    memorySize: "144 بايت",
    description: "شريحة اقتصادية سريعة مناسبة للروابط المباشرة والملصقات الذكية.",
    isActive: true,
    isDefault: false,
  },
  {
    name: "NTAG216",
    title: "NXP NTAG216",
    memorySize: "888 بايت",
    description: "سعة تخزينية عالية تتسع لبيانات VCard موسعة وروابط متعددة.",
    isActive: true,
    isDefault: false,
  },
  {
    name: "NTAG424_DNA",
    title: "NXP NTAG 424 DNA (مشفّر متقدم)",
    memorySize: "256/416 بايت",
    description: "شريحة أمان مشفرة بتقنية SUN ومصادقة ديناميكية لمنع النسخ والتزوير.",
    isActive: true,
    isDefault: false,
  },
  {
    name: "MIFARE_CLASSIC",
    title: "Mifare Classic 1K",
    memorySize: "1024 بايت",
    description: "شريحة مستخدمة في بوابات الدخول والأنظمة الأمنية والتحكم في الوصول.",
    isActive: true,
    isDefault: false,
  },
];

export const getNfcChipTypes = async (req, res, next) => {
  try {
    let chips = await NfcChipType.find().sort({ isDefault: -1, createdAt: 1 });
    
    // Auto-seed defaults if collection is empty
    if (!chips || chips.length === 0) {
      await NfcChipType.insertMany(DEFAULT_CHIP_TYPES);
      chips = await NfcChipType.find().sort({ isDefault: -1, createdAt: 1 });
    }

    res.json({ success: true, chipTypes: chips });
  } catch (error) {
    next(error);
  }
};

export const createNfcChipType = async (req, res, next) => {
  try {
    const { name, title, memorySize, description, isActive = true, isDefault = false } = req.body;
    if (!name || !title) {
      return res.status(400).json({ error: "اسم الشريحة (Code) والعنوان مطلوبان" });
    }

    const cleanName = name.trim().toUpperCase().replace(/\s+/g, "_");
    const existing = await NfcChipType.findOne({ name: cleanName });
    if (existing) {
      return res.status(400).json({ error: `نوع الشريحة (${cleanName}) موجود بالفعل` });
    }

    if (isDefault) {
      await NfcChipType.updateMany({}, { isDefault: false });
    }

    const chip = await NfcChipType.create({
      name: cleanName,
      title: title.trim(),
      memorySize: memorySize?.trim() || "504 بايت",
      description: description?.trim() || "",
      isActive: Boolean(isActive),
      isDefault: Boolean(isDefault),
    });

    res.status(201).json({ success: true, chipType: chip });
  } catch (error) {
    next(error);
  }
};

export const updateNfcChipType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, memorySize, description, isActive, isDefault } = req.body;

    const chip = await NfcChipType.findById(id);
    if (!chip) {
      return res.status(404).json({ error: "نوع الشريحة غير موجود" });
    }

    if (isDefault) {
      await NfcChipType.updateMany({ _id: { $ne: id } }, { isDefault: false });
      chip.isDefault = true;
    } else if (isDefault === false) {
      chip.isDefault = false;
    }

    if (title) chip.title = title.trim();
    if (memorySize !== undefined) chip.memorySize = memorySize.trim();
    if (description !== undefined) chip.description = description.trim();
    if (isActive !== undefined) chip.isActive = Boolean(isActive);

    await chip.save();
    res.json({ success: true, chipType: chip });
  } catch (error) {
    next(error);
  }
};

export const deleteNfcChipType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const chip = await NfcChipType.findById(id);
    if (!chip) {
      return res.status(404).json({ error: "نوع الشريحة غير موجود" });
    }

    await NfcChipType.findByIdAndDelete(id);
    res.json({ success: true, message: "تم حذف نوع الشريحة بنجاح" });
  } catch (error) {
    next(error);
  }
};
