import crypto from "node:crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";
import Card from "../models/Card.js";
import Coupon from "../models/Coupon.js";
import Setting from "../models/Setting.js";
import _landingConfig2330 from "../util/landingConfig.js";
const { mergeLandingConfig } = _landingConfig2330;
import ContactRequest from "../models/ContactRequest.js";
import CustomerService from "../models/CustomerService.js";
import ChatMessage from "../models/ChatMessage.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import AuditLog from "../models/AuditLog.js";
import _socketService3436 from "../services/socketService.js";
const { getIO, getRoomTarget } = _socketService3436;
import cloudinary from "../config/cloudinary.js";
import _env1901 from "../config/env.js";
const { env } = _env1901;
import _idGenerator8970 from "../util/idGenerator.js";
const { generatePublicId } = _idGenerator8970;

// ── Auth ──────────────────────────────────────────────────────────────────────

const safeCompare = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
};

const adminLogin = async (req, res) => {
  const { username, password } = req.body || {};
  if (
    username &&
    password &&
    safeCompare(username, env.ADMIN_USERNAME) &&
    safeCompare(password, env.ADMIN_PASSWORD)
  ) {
    const token = jwt.sign(
      { role: "superadmin", username },
      env.ADMIN_JWT_SECRET,
      { expiresIn: "7d" },
    );
    return res.json({ token, user: { username, role: "superadmin" } });
  }
  return res.status(401).json({ error: "Invalid admin credentials" });
};

// ── Subscriptions ─────────────────────────────────────────────────────────────

const getSubscriptionStats = async (req, res, next) => {
  try {
    const subCounts = await Subscription.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const statusCounts = {
      active: 0,
      trialing: 0,
      expired: 0,
      cancelled: 0,
      pending: 0,
    };
    subCounts.forEach((s) => {
      statusCounts[s._id] = s.count;
    });

    const planCounts = await Subscription.aggregate([
      { $match: { status: "active" } },
      {
        $lookup: {
          from: "plans",
          localField: "planId",
          foreignField: "_id",
          as: "plan",
        },
      },
      { $unwind: "$plan" },
      { $group: { _id: "$plan.name", count: { $sum: 1 } } },
    ]);

    const lostSubscriptions = await Subscription.find({
      status: { $in: ["cancelled", "expired"] },
    })
      .populate("userId", "name email phone avatar")
      .populate("planId", "name")
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      statusCounts,
      planCounts: planCounts.map((p) => ({ name: p._id, count: p.count })),
      metrics: {
        daily: { revenue: 0, count: 0 },
        monthly: { revenue: 0, count: 0, growth: 0 },
        yearly: { revenue: 0, count: 0 },
        total: 0,
      },
      trend: [],
      recentPayments: [],
      lostSubscriptions,
    });
  } catch (error) {
    next(error);
  }
};

// ── Stats ─────────────────────────────────────────────────────────────────────

const getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCards = await Card.countDocuments();
    const plans = await Plan.find().lean();
    const freePlan = plans.find((p) => p.key === "free");
    const activeSubscriptions = await Subscription.countDocuments({
      status: "active",
    });
    const proSubscriptions = freePlan
      ? await Subscription.countDocuments({
          status: "active",
          planId: { $ne: freePlan._id },
        })
      : 0;
    const revenue =
      proSubscriptions *
      (plans.find((p) => p.key === "pro")?.prices?.monthly || 0);

    const referralStats = await User.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$referrer", "Direct"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
    const referrers = referralStats.map((r) => {
      let name = r._id;
      if (!name || name === "مباشر" || name === "مباشرة") name = "Direct";
      else if (typeof name === "string" && name.startsWith("إحالة")) {
        name = name.replace("إحالة", "Referral");
      }
      return {
        name,
        count: r.count,
      };
    });

    res.json({
      totalUsers,
      activeSubscriptions,
      proSubscriptions,
      totalCards,
      revenue,
      referrers,
    });
  } catch (error) {
    next(error);
  }
};

// ── Users ─────────────────────────────────────────────────────────────────────

const getUsers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(query)
      .select("-passwordHash -__v")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await User.countDocuments(query);
    const plans = await Plan.find().lean();

    const result = await Promise.all(
      users.map(async (user) => {
        const sub = await Subscription.findOne({ userId: user._id, status: { $in: ["active", "trialing"] } })
          .sort({ createdAt: -1 })
          .populate("planId")
          .lean();
        const plan =
          sub?.planId && typeof sub.planId === "object"
            ? sub.planId
            : plans.find((p) => p.key === "free");
        return {
          id: user._id,
          name: user.name || "بدون اسم",
          email: user.email,
          phone: user.phone,
          username: user.username || null,
          publicId: user.publicId || null,
          activeCardId: user.activeCardId || null,
          role: user.role,
          planId: plan?._id || null,
          planKey: plan?.key || "free",
          planName: plan?.name || "Free",
          subscriptionId: sub?._id || null,
          isActive: user.isActive !== false,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        };
      }),
    );

    res.json({
      users: result,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, planKey = "free" } = req.body;
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ error: "الاسم والبريد وكلمة المرور مطلوبة" });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ error: "هذا البريد مستخدم بالفعل" });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      publicId: generatePublicId(),
      isEmailVerified: true,
    });
    const plan = await Plan.findOne({ key: planKey });
    if (plan)
      await Subscription.create({
        userId: user._id,
        planId: plan._id,
        status: "active",
        startedAt: new Date(),
      });
    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      planKey,
      isActive: true,
      createdAt: user.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const allowed = [
      "name",
      "email",
      "phone",
      "role",
      "username",
      "isEmailVerified",
    ];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k)),
    );
    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).select("-passwordHash -__v");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const toggleUserBan = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ id: user._id, isActive: user.isActive });
  } catch (error) {
    next(error);
  }
};

const changeUserPlan = async (req, res, next) => {
  try {
    const { planKey, billingPeriod = "monthly", customDays, customHours } = req.body;
    const plan = await Plan.findOne({ key: planKey });
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    if (planKey === "free") {
      // Cancel all existing active/trialing subscriptions to avoid ghost active ones
      await Subscription.updateMany(
        { userId: req.params.id, status: { $in: ["active", "trialing", "pending"] } },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
            expiresAt: null,
            billingPeriod: null,
            provider: "manual",
            planId: plan._id
          }
        }
      );
    } else {
      // Cancel old ones first
      await Subscription.updateMany(
        { userId: req.params.id, status: { $in: ["active", "trialing", "pending"] } },
        { $set: { status: "cancelled", cancelledAt: new Date() } }
      );

      let expiresAt = new Date();
      if (customHours && parseInt(customHours, 10) > 0) {
        expiresAt.setHours(expiresAt.getHours() + parseInt(customHours, 10));
      } else if (customDays && parseInt(customDays, 10) > 0) {
        expiresAt.setDate(expiresAt.getDate() + parseInt(customDays, 10));
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + (billingPeriod === "yearly" ? 12 : 1));
      }
      
      await Subscription.create({ 
        userId: req.params.id,
        planId: plan._id, 
        status: "active", 
        startedAt: new Date(), 
        billingPeriod, 
        expiresAt,
        provider: "manual"
      });
    }

    res.json({ success: true, planKey });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Subscription.deleteMany({ userId: req.params.id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const getUserCards = async (req, res, next) => {
  try {
    const cards = await Card.find({ userId: req.params.id })
      .select(
        "name publicId personal.fullName personal.title personal.avatar personal.coverImage isActive contacts links requests analytics createdAt",
      )
      .sort({ createdAt: -1 })
      .lean();
    res.json(cards);
  } catch (error) {
    next(error);
  }
};

// ── Cards ─────────────────────────────────────────────────────────────────────

const getCard = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.id).lean();
    if (!card) return res.status(404).json({ error: "Card not found" });
    res.json(card);
  } catch (error) {
    next(error);
  }
};

const updateCard = async (req, res, next) => {
  try {
    const { name, personal, contacts, links, isActive } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (personal !== undefined) updates.personal = personal;
    if (contacts !== undefined) updates.contacts = contacts;
    if (links !== undefined) updates.links = links;
    if (isActive !== undefined) updates.isActive = isActive;
    const card = await Card.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true },
    ).lean();
    if (!card) return res.status(404).json({ error: "Card not found" });
    res.json(card);
  } catch (error) {
    next(error);
  }
};

const deleteCard = async (req, res, next) => {
  try {
    const card = await Card.findByIdAndDelete(req.params.id);
    if (!card) return res.status(404).json({ error: "Card not found" });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ── Upload ────────────────────────────────────────────────────────────────────

const __ctrlFilename = fileURLToPath(import.meta.url);
const __ctrlDirname = path.dirname(__ctrlFilename);
const DASH_UPLOADS_DIR = path.resolve(__ctrlDirname, "../../public/uploads");
const SITE_UPLOADS_DIR = path.resolve(__ctrlDirname, "../../../../SITE/FRONTEND/public/uploads");

const saveLocally = (base64Data, folder) => {
  if (!fs.existsSync(DASH_UPLOADS_DIR)) {
    fs.mkdirSync(DASH_UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(SITE_UPLOADS_DIR)) {
    try {
      fs.mkdirSync(SITE_UPLOADS_DIR, { recursive: true });
    } catch {}
  }

  let mimeType = "image/png";
  let ext = "png";
  let base64Clean = base64Data;

  const match = base64Data.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
  if (match) {
    mimeType = match[1];
    base64Clean = base64Data.slice(match[0].length);
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = "jpg";
    else if (mimeType.includes("webp")) ext = "webp";
    else if (mimeType.includes("gif")) ext = "gif";
    else if (mimeType.includes("svg")) ext = "svg";
    else if (mimeType.includes("png")) ext = "png";
  }

  const buffer = Buffer.from(base64Clean, "base64");
  const safeFolder = (folder || "prod").replace(/[^a-zA-Z0-9_-]/g, "");
  const filename = `${safeFolder}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;

  fs.writeFileSync(path.join(DASH_UPLOADS_DIR, filename), buffer);

  try {
    fs.writeFileSync(path.join(SITE_UPLOADS_DIR, filename), buffer);
  } catch {}

  const port = process.env.PORT || 4001;
  const baseUrl = process.env.APP_URL || `http://localhost:${port}`;
  return `${baseUrl}/uploads/${filename}`;
};

const adminUpload = async (req, res, next) => {
  try {
    const { image, folder = "thenith_admin" } = req.body;
    if (!image) return res.status(400).json({ error: "Image is required" });

    // 1. Try Cloudinary if fully configured
    if (
      env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET
    ) {
      try {
        const result = await cloudinary.uploader.upload(image, { folder });
        if (result?.secure_url) {
          return res.json({ url: result.secure_url });
        }
      } catch (cloudinaryErr) {
        console.warn("Cloudinary upload failed, falling back to local storage:", cloudinaryErr.message);
      }
    }

    // 2. Seamless local fallback
    const localUrl = saveLocally(image, folder);
    res.json({ url: localUrl });
  } catch (error) {
    next(error);
  }
};

// ── Products ──────────────────────────────────────────────────────────────────

const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    res.json(products);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      images,
      price,
      quantity,
      sku,
      category,
      isActive,
    } = req.body;
    if (!name) return res.status(400).json({ error: "اسم المنتج مطلوب" });
    const product = await Product.create({
      name,
      description,
      images,
      price,
      quantity,
      sku,
      category,
      isActive,
    });
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      images,
      price,
      quantity,
      sku,
      category,
      isActive,
    } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, description, images, price, quantity, sku, category, isActive },
      { new: true },
    );
    if (!product) return res.status(404).json({ error: "المنتج غير موجود" });
    res.json(product);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "المنتج غير موجود" });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ── Store Stats ───────────────────────────────────────────────────────────────

const getStoreStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthOrders = await Order.find({
      createdAt: { $gte: startOfThisMonth },
      status: { $ne: "returned" },
    });
    const lastMonthOrders = await Order.find({
      createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth },
      status: { $ne: "returned" },
    });

    const thisMonthRevenue = thisMonthOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0,
    );
    const lastMonthRevenue = lastMonthOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0,
    );

    const lowStockProducts = await Product.find({
      quantity: { $lt: 5, $gt: 0 },
    }).lean();
    const outOfStockProducts = await Product.find({ quantity: 0 }).lean();

    const completedOrders = await Order.find({
      status: { $in: ["delivered", "shipped"] },
    }).lean();
    const productSales = {};
    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productSales[item.productId])
          productSales[item.productId] = {
            name: item.name,
            count: 0,
            revenue: 0,
          };
        productSales[item.productId].count += item.quantity;
        productSales[item.productId].revenue += item.quantity * item.price;
      });
    });
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const statusCounts = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const formattedStatusCounts = {
      received: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      returned: 0,
    };
    statusCounts.forEach((s) => {
      formattedStatusCounts[s._id] = s.count;
    });

    res.json({
      revenue: {
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growth:
          lastMonthRevenue === 0
            ? thisMonthRevenue > 0
              ? 100
              : 0
            : ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100,
      },
      inventory: {
        lowStock: lowStockProducts.length,
        outOfStock: outOfStockProducts.length,
      },
      topProducts,
      statusCounts: formattedStatusCounts,
    });
  } catch (error) {
    next(error);
  }
};

// ── Orders ────────────────────────────────────────────────────────────────────

const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, returnReason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "الطلب غير موجود" });

    if (status === "returned" && order.status !== "returned") {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: item.quantity },
        });
      }
    }
    if (order.status === "returned" && status !== "returned") {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: -item.quantity },
        });
      }
    }

    order.status = status;
    if (returnReason !== undefined) order.returnReason = returnReason;
    await order.save();
    res.json(order);
  } catch (error) {
    next(error);
  }
};

// ── Plans ─────────────────────────────────────────────────────────────────────

const getAdminPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find().lean();
    res.json(plans);
  } catch (error) {
    next(error);
  }
};

const createPlan = async (req, res, next) => {
  try {
    const { key, name, prices, features, limits, marketingFeatures } = req.body;
    if (!key || !name)
      return res.status(400).json({ error: "المفتاح والاسم مطلوبان" });
    const existing = await Plan.findOne({ key });
    if (existing)
      return res.status(409).json({ error: "هذا المفتاح موجود بالفعل" });
    const plan = await Plan.create({
      key,
      name,
      prices,
      features,
      limits,
      marketingFeatures,
    });
    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
};

const updatePlan = async (req, res, next) => {
  try {
    const { name, prices, features, limits, isActive, marketingFeatures } =
      req.body;
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    if (name !== undefined) {
      plan.name = name;
      plan.markModified("name");
    }
    if (prices !== undefined) plan.prices = prices;
    if (limits !== undefined) plan.limits = limits;
    if (isActive !== undefined) plan.isActive = isActive;
    if (marketingFeatures !== undefined) {
      plan.marketingFeatures = marketingFeatures;
      plan.markModified("marketingFeatures");
    }
    if (features !== undefined) {
      plan.features = features;
      plan.markModified("features");
    }
    await plan.save();
    res.json(plan);
  } catch (error) {
    next(error);
  }
};

const deletePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ── Coupons ───────────────────────────────────────────────────────────────────

const getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json(coupons);
  } catch (error) {
    next(error);
  }
};

const createCoupon = async (req, res, next) => {
  try {
    const {
      couponId,
      code,
      discountType,
      discountValue,
      monthlyDiscountValue,
      yearlyDiscountValue,
      appliesTo,
      applicablePlan,
      maxUses,
      expiresAt,
      isActive,
    } = req.body;
    if (!code || !discountType || discountValue === undefined)
      return res
        .status(400)
        .json({ error: "الكود، نوع الخصم، وقيمة الخصم مطلوبة" });
    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing)
      return res.status(409).json({ error: "هذا الكود موجود بالفعل" });

    const finalCouponId = (couponId && String(couponId).trim())
      ? String(couponId).trim()
      : ("CPN-" + Math.random().toString(36).substring(2, 8).toUpperCase());

    const parsedMaxUses = (maxUses === "" || maxUses === null || maxUses === undefined || Number(maxUses) <= 0) ? null : Number(maxUses);

    const coupon = await Coupon.create({
      couponId: finalCouponId,
      code: code.toUpperCase().trim(),
      discountType,
      discountValue,
      monthlyDiscountValue,
      yearlyDiscountValue,
      appliesTo,
      applicablePlan,
      maxUses: parsedMaxUses,
      expiresAt,
      isActive,
    });
    res.status(201).json(coupon);
  } catch (error) {
    next(error);
  }
};

const updateCoupon = async (req, res, next) => {
  try {
    const {
      couponId,
      code,
      discountType,
      discountValue,
      monthlyDiscountValue,
      yearlyDiscountValue,
      appliesTo,
      applicablePlan,
      maxUses,
      expiresAt,
      isActive,
    } = req.body;
    if (code) {
      const existing = await Coupon.findOne({
        code: code.toUpperCase(),
        _id: { $ne: req.params.id },
      });
      if (existing)
        return res.status(409).json({ error: "هذا الكود مستخدم في كوبون آخر" });
    }

    const oldCoupon = await Coupon.findById(req.params.id);
    if (!oldCoupon) return res.status(404).json({ error: "الكوبون غير موجود" });

    const parsedMaxUses = (maxUses === "" || maxUses === null || maxUses === undefined || Number(maxUses) <= 0) ? null : Number(maxUses);

    const updateFields = {
      ...(code ? { code: code.toUpperCase().trim() } : {}),
      discountType,
      discountValue,
      monthlyDiscountValue,
      yearlyDiscountValue,
      appliesTo,
      applicablePlan: applicablePlan || "all",
      maxUses: parsedMaxUses,
      expiresAt,
      isActive,
    };

    if (couponId !== undefined) {
      const newCId = String(couponId).trim();
      updateFields.couponId = newCId;
      if (newCId !== oldCoupon.couponId) {
        updateFields.usedBy = [];
        updateFields.usedCount = 0;
      }
    }

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true },
    );
    res.json(coupon);
  } catch (error) {
    next(error);
  }
};

const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ error: "الكوبون غير موجود" });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ── Store Settings ────────────────────────────────────────────────────────────

const getStoreSettings = async (req, res, next) => {
  try {
    let config = await Setting.findOne({ key: "store_config" }).lean();
    if (!config) {
      config = {
        key: "store_config",
        value: {
          taxRate: 0,
          shippingZones: [
            { id: "1", name: "القاهرة والجيزة", cost: 50, isActive: true },
            { id: "2", name: "محافظات الدلتا", cost: 60, isActive: true },
            {
              id: "3",
              name: "الصعيد والبحر الأحمر",
              cost: 100,
              isActive: true,
            },
          ],
          storePolicy: "سياسة الاسترجاع خلال 14 يوم...",
        },
      };
      await Setting.create(config);
    }
    res.json(config.value);
  } catch (error) {
    next(error);
  }
};

const updateStoreSettings = async (req, res, next) => {
  try {
    const { taxRate, shippingZones, storePolicy } = req.body;
    const updated = await Setting.findOneAndUpdate(
      { key: "store_config" },
      { value: { taxRate, shippingZones, storePolicy } },
      { new: true, upsert: true },
    );
    res.json(updated.value);
  } catch (error) {
    next(error);
  }
};

const getLandingSettings = async (req, res, next) => {
  try {
    const setting = await Setting.findOne({ key: "landing_config" }).lean();
    res.json(mergeLandingConfig(setting?.value));
  } catch (error) {
    next(error);
  }
};

const updateLandingSettings = async (req, res, next) => {
  try {
    const value = mergeLandingConfig(req.body || {});
    const updated = await Setting.findOneAndUpdate(
      { key: "landing_config" },
      { value },
      { new: true, upsert: true },
    );
    res.json(mergeLandingConfig(updated.value));
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const settingsObj = req.body;
    const promises = Object.keys(settingsObj).map((key) =>
      Setting.findOneAndUpdate(
        { key },
        { value: settingsObj[key] },
        { upsert: true, new: true },
      ),
    );
    await Promise.all(promises);
    res.json({ message: "Settings updated successfully" });
  } catch (error) {
    next(error);
  }
};

// ── Messages ──────────────────────────────────────────────────────────────────

const getMessages = async (req, res, next) => {
  try {
    const messages = await ContactRequest.find({ type: "platform_contact" }).sort({ createdAt: -1 }).lean();
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

const markMessageRead = async (req, res, next) => {
  try {
    const message = await ContactRequest.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true },
    );
    res.json(message);
  } catch (error) {
    next(error);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    await ContactRequest.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ── Support / CustomerServices ───────────────────────────────────────────────────

const getCustomerServices = async (req, res, next) => {
  try {
    const customerServices = await CustomerService.find()
      .sort({ lastMessageAt: -1 })
      .populate("user", "name email");
    res.json(customerServices);
  } catch (error) {
    next(error);
  }
};

const getCustomerServiceMessages = async (req, res, next) => {
  try {
    const messages = await ChatMessage.find({
      customerService: req.params.id,
    }).sort("createdAt");
    const customerService = await CustomerService.findById(req.params.id);
    if (customerService?.unreadAdmin > 0) {
      customerService.unreadAdmin = 0;
      await customerService.save();
    }
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

const sendCustomerServiceMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    const customerService = await CustomerService.findById(req.params.id);
    if (!customerService)
      return res.status(404).json({ error: "CustomerService not found" });

    const message = await ChatMessage.create({
      customerService: customerService._id,
      senderModel: "Admin",
      senderId: req.admin ? req.admin.username : "admin",
      content,
    });

    customerService.lastMessageAt = new Date();
    customerService.unreadUser += 1;
    if (customerService.status === "closed") customerService.status = "open";
    await customerService.save();

    const io = getIO();
    const room = getRoomTarget(io, `customerService_${customerService._id}`);
    const adminRoom = getRoomTarget(io, "admin_room");
    room?.emit("newMessage", message);
    adminRoom?.emit("customerServiceUpdated", customerService);
    res.json(message);
  } catch (error) {
    next(error);
  }
};

const updateCustomerServiceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const customerService = await CustomerService.findById(req.params.id);
    if (!customerService)
      return res.status(404).json({ error: "CustomerService not found" });

    customerService.status = status;
    await customerService.save();

    let sysText = "تم تحديث حالة المحادثة.";
    if (status === "resolved")
      sysText = "تم إنهاء هذه المحادثة. أرسل رسالة جديدة لإعادة فتحها.";
    else if (status === "closed")
      sysText = "تم إغلاق هذه المحادثة. أرسل رسالة جديدة لإعادة فتحها.";
    else if (status === "open") sysText = "تم إعادة فتح المحادثة.";

    const io = getIO();
    const room = getRoomTarget(io, `customerService_${customerService._id}`);
    const adminRoom = getRoomTarget(io, "admin_room");
    if (sysText) {
      const message = await ChatMessage.create({
        customerService: customerService._id,
        senderModel: "System",
        senderId: "system",
        content: sysText,
      });
      room?.emit("newMessage", message);
    }
    room?.emit("customerServiceStatusChanged", customerService);
    adminRoom?.emit("customerServiceUpdated", customerService);

    res.json(customerService);
  } catch (error) {
    next(error);
  }
};

// ── Audit Logs ────────────────────────────────────────────────────────────────

const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      level,
      category,
      search,
      startDate,
      endDate,
    } = req.query;
    const query = {};
    if (level) query.level = level;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { message: { $regex: search, $options: "i" } },
        { ip: { $regex: search, $options: "i" } },
        { networkIp: { $regex: search, $options: "i" } },
        { path: { $regex: search, $options: "i" } },
      ];
    }
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("userId", "username email");
    const total = await AuditLog.countDocuments(query);
    res.json({ logs, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAuditStats = async (req, res) => {
  try {
    const totalLogs = await AuditLog.countDocuments();
    const criticalThreats = await AuditLog.countDocuments({
      level: "critical",
    });
    const warnings = await AuditLog.countDocuments({ level: "warning" });
    const topIPs = await AuditLog.aggregate([
      { $match: { level: { $in: ["warning", "critical"] } } },
      { $group: { _id: "$ip", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);
    const categories = await AuditLog.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ totalLogs, criticalThreats, warnings, topIPs, categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  adminLogin,
  getSubscriptionStats,
  getStats,
  getUsers,
  createUser,
  updateUser,
  toggleUserBan,
  changeUserPlan,
  deleteUser,
  getUserCards,
  getCard,
  updateCard,
  deleteCard,
  adminUpload,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getStoreStats,
  getOrders,
  updateOrderStatus,
  getAdminPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getStoreSettings,
  updateStoreSettings,
  getLandingSettings,
  updateLandingSettings,
  updateSettings,
  getMessages,
  markMessageRead,
  deleteMessage,
  getCustomerServices,
  getCustomerServiceMessages,
  sendCustomerServiceMessage,
  updateCustomerServiceStatus,
  getAuditLogs,
  getAuditStats,
};
