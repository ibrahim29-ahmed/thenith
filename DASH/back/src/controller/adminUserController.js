import AdminUser from "../models/AdminUser.js";
import _env from "../config/env.js";
const { env } = _env;
import { AVAILABLE_PERMISSIONS, ALL_PERMISSION_IDS } from "../config/permissions.js";

// List all admin team members
export const getAdminUsers = async (req, res, next) => {
  try {
    const dbAdmins = await AdminUser.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    // Include the root superadmin from environment config
    const rootSuperAdmin = {
      _id: "superadmin",
      name: "المدير العام",
      username: env.ADMIN_USERNAME || "admin",
      email: "admin@thenith.com",
      role: "superadmin",
      title: "المالك والمسؤول الرئيسي",
      isActive: true,
      permissions: ["*"],
      isRoot: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    return res.json({
      ok: true,
      success: true,
      users: [rootSuperAdmin, ...dbAdmins],
      availablePermissions: AVAILABLE_PERMISSIONS,
    });
  } catch (err) {
    next(err);
  }
};

// Create a new admin user
export const createAdminUser = async (req, res, next) => {
  try {
    const { name, username, email, password, title, permissions } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "الاسم مطلوب" });
    }

    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ error: "اسم المستخدم مطلوب" });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: "اسم المستخدم يجب ألا يقل عن 3 أحرف" });
    }

    if (cleanUsername === (env.ADMIN_USERNAME || "").trim().toLowerCase()) {
      return res.status(400).json({ error: "اسم المستخدم محجوز للمسؤول الرئيسي" });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "كلمة المرور مطلوبة وتتكون من 6 أحرف على الأقل" });
    }

    const existing = await AdminUser.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(400).json({ error: "اسم المستخدم مستخدم بالفعل، اختر اسماً آخر" });
    }

    // Validate permissions array
    const validPermissions = Array.isArray(permissions)
      ? permissions.filter((p) => ALL_PERMISSION_IDS.includes(p) || p === "*")
      : [];

    const newAdmin = new AdminUser({
      name: name.trim(),
      username: cleanUsername,
      email: email ? email.trim().toLowerCase() : "",
      password: password.trim(),
      role: "admin",
      title: title?.trim() || "مشرف لوحة التحكم",
      isActive: true,
      permissions: validPermissions,
      createdBy: req.admin?.username || "superadmin",
    });

    await newAdmin.save();

    const result = newAdmin.toObject();
    delete result.password;

    return res.status(201).json({
      ok: true,
      success: true,
      message: "تم إنشاء حساب المشرف بنجاح وتعيين الصلاحيات",
      user: result,
    });
  } catch (err) {
    next(err);
  }
};

// Update an existing admin user
export const updateAdminUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === "superadmin") {
      return res.status(403).json({ error: "لا يمكن تعديل بيانات المسؤول الرئيسي من هنا" });
    }

    const admin = await AdminUser.findById(id);
    if (!admin) {
      return res.status(404).json({ error: "المشرف غير موجود" });
    }

    const { name, email, password, title, permissions } = req.body || {};

    if (name && typeof name === "string" && name.trim()) {
      admin.name = name.trim();
    }

    if (typeof email === "string") {
      admin.email = email.trim().toLowerCase();
    }

    if (title && typeof title === "string") {
      admin.title = title.trim();
    }

    if (Array.isArray(permissions)) {
      admin.permissions = permissions.filter(
        (p) => ALL_PERMISSION_IDS.includes(p) || p === "*"
      );
    }

    if (password && typeof password === "string" && password.trim().length >= 6) {
      admin.password = password.trim();
    }

    await admin.save();

    const result = admin.toObject();
    delete result.password;

    return res.json({
      ok: true,
      success: true,
      message: "تم تحديث بيانات وصلاحيات المشرف بنجاح",
      user: result,
    });
  } catch (err) {
    next(err);
  }
};

// Toggle active/disabled status
export const toggleAdminUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === "superadmin") {
      return res.status(403).json({ error: "لا يمكن تعطيل حساب المسؤول الرئيسي" });
    }

    const admin = await AdminUser.findById(id);
    if (!admin) {
      return res.status(404).json({ error: "المشرف غير موجود" });
    }

    admin.isActive = !admin.isActive;
    await admin.save();

    return res.json({
      ok: true,
      success: true,
      message: admin.isActive ? "تم تفعيل الحساب بنجاح" : "تم تعطيل الحساب بنجاح",
      isActive: admin.isActive,
    });
  } catch (err) {
    next(err);
  }
};

// Delete an admin user
export const deleteAdminUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === "superadmin") {
      return res.status(403).json({ error: "لا يمكن حذف المسؤول الرئيسي" });
    }

    if (req.admin?.id === id) {
      return res.status(400).json({ error: "لا يمكنك حذف حسابك الحالي" });
    }

    const deleted = await AdminUser.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "المشرف غير موجود" });
    }

    return res.json({
      ok: true,
      success: true,
      message: "تم حذف المشرف بنجاح",
    });
  } catch (err) {
    next(err);
  }
};

// Get available permissions catalog
export const getPermissionsCatalog = async (req, res) => {
  return res.json({
    ok: true,
    success: true,
    permissions: AVAILABLE_PERMISSIONS,
  });
};

