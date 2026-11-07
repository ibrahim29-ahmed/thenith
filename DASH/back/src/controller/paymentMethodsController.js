import {
  getPaymentConfig,
  savePaymentConfig,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_GLOBAL_SETTINGS,
} from "../util/paymentConfig.js";
import _env from "../config/env.js";
const { env } = _env;

// Helper to get Fawaterak token if needed
async function getFawaterakToken() {
  if (!env.FAWATERAK_API_KEY) return null;
  return env.FAWATERAK_API_KEY;
}

export const getPaymentMethods = async (req, res, next) => {
  try {
    const config = await getPaymentConfig();
    res.json({
      success: true,
      methods: config.methods,
      globalSettings: config.globalSettings,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentMethods = async (req, res, next) => {
  try {
    const { methods, globalSettings } = req.body;
    if (!Array.isArray(methods)) {
      return res.status(400).json({ error: "قائمة طرق الدفع غير صالحة" });
    }

    const currentConfig = await getPaymentConfig();
    const updatedMethods = methods.map((m, index) => ({
      ...m,
      sort_order: m.sort_order !== undefined ? Number(m.sort_order) : index + 1,
      commission_on_customer: Number(m.commission_on_customer || 0),
      fixed_fee: Number(m.fixed_fee || 0),
      enabled: Boolean(m.enabled),
    }));

    const updatedGlobalSettings = {
      ...currentConfig.globalSettings,
      ...(globalSettings || {}),
    };

    if (globalSettings && typeof globalSettings.cod_enabled === "boolean") {
      const codInList = updatedMethods.find((m) => m.id === "cash_on_delivery");
      if (codInList) {
        codInList.enabled = globalSettings.cod_enabled;
      }
      updatedGlobalSettings.cod_enabled = globalSettings.cod_enabled;
    } else {
      const codInList = updatedMethods.find((m) => m.id === "cash_on_delivery");
      if (codInList) {
        updatedGlobalSettings.cod_enabled = Boolean(codInList.enabled);
      }
    }

    const saved = await savePaymentConfig({
      methods: updatedMethods,
      globalSettings: updatedGlobalSettings,
    });

    res.json({
      success: true,
      message: "تم حفظ إعدادات طرق الدفع بنجاح",
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

export const togglePaymentMethod = async (req, res, next) => {
  try {
    const { id } = req.params;
    const config = await getPaymentConfig();
    let methodFound = false;
    let newStatus = false;

    const updatedMethods = config.methods.map((method) => {
      const isIdMatch = String(method.id) === String(id);
      const isMethodIdMatch = method.payment_method_id != null && String(method.payment_method_id) === String(id);
      if (isIdMatch || isMethodIdMatch) {
        methodFound = true;
        newStatus = !method.enabled;
        return { ...method, enabled: newStatus };
      }
      return method;
    });

    if (!methodFound) {
      return res.status(404).json({ error: "طريقة الدفع غير موجودة" });
    }

    const updatedGlobalSettings = { ...config.globalSettings };
    if (id === "cash_on_delivery") {
      updatedGlobalSettings.cod_enabled = newStatus;
    }

    const saved = await savePaymentConfig({
      methods: updatedMethods,
      globalSettings: updatedGlobalSettings,
    });

    res.json({
      success: true,
      message: `تم ${newStatus ? "تفعيل" : "تعطيل"} طريقة الدفع بنجاح`,
      enabled: newStatus,
      methods: saved.methods,
      globalSettings: saved.globalSettings,
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomPaymentMethod = async (req, res, next) => {
  try {
    const {
      name_ar,
      name_en,
      type = "manual",
      description_ar = "",
      description_en = "",
      instructions_ar = "",
      instructions_en = "",
      account_details = "",
      commission_on_customer = 0,
      fixed_fee = 0,
      icon = "Wallet",
      badge = "يدوي",
      allow_for_subscriptions = true,
      allow_for_store_orders = true,
    } = req.body;

    if (!name_ar) {
      return res.status(400).json({ error: "اسم طريقة الدفع بالعربية مطلوب" });
    }

    const config = await getPaymentConfig();
    const newMethod = {
      id: `custom_${Date.now()}`,
      payment_method_id: null,
      type,
      name_ar,
      name_en: name_en || name_ar,
      description_ar,
      description_en,
      instructions_ar,
      instructions_en,
      account_details,
      logo: "",
      icon,
      badge,
      enabled: true,
      redirect: "false",
      commission_on_customer: Number(commission_on_customer) || 0,
      fixed_fee: Number(fixed_fee) || 0,
      allow_for_subscriptions: Boolean(allow_for_subscriptions),
      allow_for_store_orders: Boolean(allow_for_store_orders),
      sort_order: config.methods.length + 1,
    };

    const updatedMethods = [...config.methods, newMethod];
    const saved = await savePaymentConfig({
      methods: updatedMethods,
      globalSettings: config.globalSettings,
    });

    res.json({
      success: true,
      message: "تمت إضافة طريقة الدفع الجديدة بنجاح",
      method: newMethod,
      methods: saved.methods,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomPaymentMethod = async (req, res, next) => {
  try {
    const { id } = req.params;
    const config = await getPaymentConfig();
    const isSystemMethod = ["card", "wallet", "fawry", "cash_on_delivery"].includes(id);

    if (isSystemMethod) {
      return res.status(400).json({
        error: "لا يمكن حذف طرق الدفع الأساسية للنظام، يمكنك تعطيلها بدلاً من ذلك.",
      });
    }

    const filtered = config.methods.filter((m) => String(m.id) !== String(id));
    const saved = await savePaymentConfig({
      methods: filtered,
      globalSettings: config.globalSettings,
    });

    res.json({
      success: true,
      message: "تم حذف طريقة الدفع بنجاح",
      methods: saved.methods,
    });
  } catch (error) {
    next(error);
  }
};

export const syncFawaterakMethods = async (req, res, next) => {
  try {
    const apiKey = await getFawaterakToken();
    const baseUrl = env.FAWATERAK_BASE_URL || "https://staging.fawaterk.com";

    let fawaterakList = [];
    if (apiKey) {
      try {
        const response = await fetch(`${baseUrl}/api/v3/getTrPaymentmethods`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10000),
        });
        const resData = await response.json();
        if (resData?.status === "success" && Array.isArray(resData?.data)) {
          fawaterakList = resData.data;
        }
      } catch (fErr) {
        // Fallback gracefully if API is unreachable
      }
    }

    const config = await getPaymentConfig();
    let currentMethods = [...config.methods];

    if (fawaterakList.length > 0) {
      fawaterakList.forEach((fm) => {
        const existingIdx = currentMethods.findIndex(
          (m) => Number(m.payment_method_id) === Number(fm.payment_method_id)
        );
        if (existingIdx >= 0) {
          // Update logo and redirect info if available, preserve custom settings
          currentMethods[existingIdx] = {
            ...currentMethods[existingIdx],
            logo: fm.logo || currentMethods[existingIdx].logo,
            redirect: String(fm.redirect),
          };
        } else {
          // Add newly discovered method from gateway
          currentMethods.push({
            id: `fawaterak_${fm.payment_method_id}`,
            payment_method_id: fm.payment_method_id,
            type: "online",
            name_ar: fm.name_ar || fm.name_en,
            name_en: fm.name_en || fm.name_ar,
            description_ar: `الدفع عبر ${fm.name_ar || fm.name_en}`,
            description_en: `Pay via ${fm.name_en || fm.name_ar}`,
            logo: fm.logo || "",
            icon: "CreditCard",
            badge: "بوابة فواتيرك",
            enabled: true,
            redirect: String(fm.redirect),
            commission_on_customer: Number(fm.commission_on_customer || 0),
            fixed_fee: 0,
            allow_for_subscriptions: true,
            allow_for_store_orders: true,
            instructions_ar: "",
            instructions_en: "",
            sort_order: currentMethods.length + 1,
          });
        }
      });
    }

    const saved = await savePaymentConfig({
      methods: currentMethods,
      globalSettings: config.globalSettings,
    });

    res.json({
      success: true,
      message: fawaterakList.length > 0
        ? `تمت مزامنة ${fawaterakList.length} طريقة دفع من بوابة فواتيرك بنجاح`
        : "تمت مراجعة طرق الدفع وتحديثها بنجاح وفق الإعدادات الحالية",
      methods: saved.methods,
      globalSettings: saved.globalSettings,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPaymentMethodsToDefault = async (req, res, next) => {
  try {
    const saved = await savePaymentConfig({
      methods: DEFAULT_PAYMENT_METHODS,
      globalSettings: DEFAULT_GLOBAL_SETTINGS,
    });

    res.json({
      success: true,
      message: "تمت استعادة طرق الدفع الافتراضية بنجاح",
      methods: saved.methods,
      globalSettings: saved.globalSettings,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getPaymentMethods,
  updatePaymentMethods,
  togglePaymentMethod,
  createCustomPaymentMethod,
  deleteCustomPaymentMethod,
  syncFawaterakMethods,
  resetPaymentMethodsToDefault,
};
