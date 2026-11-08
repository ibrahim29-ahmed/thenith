import OrderDraft from "../models/OrderDraft.js";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import ShippingRate from "../models/ShippingRate.js";
import mailService from "../util/mail.js";
import _dashboardNotifications from "../util/dashboardNotifications.js";
const { notifyUser } = _dashboardNotifications;
const { sendOrderEmail } = mailService;

import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import { processCustomCardsForOrder } from "../services/customCardOrderService.js";
import { getPaymentConfig } from "../util/paymentConfig.js";
import { ensureUserPhone } from "./paymentController.js";
import { getCouponUsageId, hasUsedCouponId } from "../util/couponUsage.js";

// POST /api/checkout/validate-coupon
export const validateCoupon = async (req, res) => {
  try {
    const { code, target } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Coupon code is required." });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

    if (!coupon) {
      return res.status(404).json({ error: "هذا الكوبون غير موجود." });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ error: "هذا الكوبون غير مفعل." });
    }

    // Check expiry
    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      return res.status(400).json({ error: "انتهت صلاحية هذا الكوبون." });
    }

    // Check max uses
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return res
        .status(400)
        .json({ error: "تم استنفاد الحد الأقصى لاستخدام هذا الكوبون." });
    }

    // Strictly enforce one use per user based on couponId
    if (req.user) {
      const couponTrackingId = getCouponUsageId(coupon);
      const userDoc = await User.findById(req.user._id).select("usedCouponIds");
      const hasUsedThisId = hasUsedCouponId(userDoc?.usedCouponIds, couponTrackingId);
      const hasUsedInTx = await PaymentTransaction.exists({
        userId: req.user._id,
        status: "paid",
        "paymentData.couponId": couponTrackingId,
      });
      if (hasUsedThisId || hasUsedInTx) {
        return res
          .status(400)
          .json({ error: "لقد تم استخدام هذا الكود مسبقاً" });
      }
    }

    // Validate target: coupon must apply to "all" or "store"
    if (target === "store" && coupon.appliesTo === "subscriptions") {
      return res
        .status(400)
        .json({ error: "هذا الكوبون خاص بالاشتراكات فقط وليس المتجر." });
    }

    return res.json({
      valid: true,
      type: coupon.discountType, // "percentage" | "fixed"
      value: coupon.discountValue,
      code: coupon.code,
    });
  } catch (error) {
    res.status(500).json({ error: "حدث خطأ أثناء التحقق من الكوبون." });
  }
};

const activeCheckoutLocks = new Map();

function runWithCheckoutLock(lockKey, task) {
  if (activeCheckoutLocks.has(lockKey)) {
    return activeCheckoutLocks.get(lockKey);
  }

  const promise = (async () => {
    try {
      return await task();
    } finally {
      setTimeout(() => {
        activeCheckoutLocks.delete(lockKey);
      }, 1500);
    }
  })();

  activeCheckoutLocks.set(lockKey, promise);
  return promise;
}

export const createOrder = async (req, res) => {
  try {
    const { items, customer, paymentMethod, couponCode } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Order must contain items." });
    }

    if (
      !customer ||
      !customer.name ||
      !customer.phone ||
      !customer.address ||
      !customer.city
    ) {
      return res.status(400).json({ error: "Incomplete customer details." });
    }

    if (!["online", "cash_on_delivery", "free"].includes(paymentMethod)) {
      return res.status(400).json({
        error: "A supported payment method is required.",
        code: "INVALID_PAYMENT_METHOD",
      });
    }

    if (paymentMethod === "cash_on_delivery") {
      const pConfig = await getPaymentConfig();
      const codMethod = pConfig.methods.find((m) => m.id === "cash_on_delivery");
      if (pConfig.globalSettings?.cod_enabled === false || (codMethod && !codMethod.enabled)) {
        return res.status(400).json({
          error: "خيار الدفع عند الاستلام معطل حالياً من قبل الإدارة.",
          code: "COD_DISABLED",
        });
      }
    }
    if (!req.user?._id) {
      return res
        .status(401)
        .json({ error: "Sign in before placing an order." });
    }

    const userPhone = await ensureUserPhone(req.user, req);
    if (!userPhone) {
      return res.status(400).json({ error: "يجب إضافة رقم هاتف لحسابك قبل إتمام الطلب." });
    }

    // Auto-cancel any lingering card transactions for this user (cards are instant: finish or terminate)
    await PaymentTransaction.updateMany(
      {
        userId: req.user._id,
        status: "pending",
        $or: [
          { paymentMethodId: 2 },
          { paymentMethodName: { $regex: /visa|mastercard|card|فيزا|ماستر|بطاقة/i } },
        ],
      },
      { $set: { status: "cancelled" } }
    );



    const itemFingerprint = items.map((i) => `${i.productId || i.id}:${i.quantity}`).join(",");
    const lockKey = `order_create_${req.user._id}_${paymentMethod}_${itemFingerprint}`;

    const result = await runWithCheckoutLock(lockKey, async () => {
      // 1. Fetch real prices from database
      const productIds = items.map((item) => item.productId || item.id);
      const productsFromDb = await Product.find({ _id: { $in: productIds } });

      let subTotal = 0;
      const finalItems = [];

      for (const item of items) {
        const pId = item.productId || item.id;
        if (!pId || !mongoose.isValidObjectId(pId)) {
          return { status: 400, data: { error: "Invalid product identifier." } };
        }

        const qty = Number(item.quantity);
        if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
          return {
            status: 400,
            data: { error: "Invalid item quantity. Must be an integer between 1 and 99." },
          };
        }

        const dbProduct = productsFromDb.find(
          (p) => p._id.toString() === pId,
        );
        if (!dbProduct) {
          return { status: 400, data: { error: `Product not found: ${item.name || pId}` } };
        }

        const itemTotal = dbProduct.price * qty;
        subTotal += itemTotal;

        const defaultProductImg = Array.isArray(dbProduct.images)
          ? (typeof dbProduct.images[0] === "object" ? dbProduct.images[0]?.url : dbProduct.images[0])
          : (dbProduct.image || "");

        finalItems.push({
          productId: dbProduct._id,
          name: dbProduct.name,
          price: dbProduct.price,
          quantity: qty,
          selectedImage: item.selectedImage || item.image || defaultProductImg || "",
          selectedImageId: item.selectedImageId || "",
          image: item.selectedImage || item.image || defaultProductImg || "",
          color: item.color || null,
          customDesign: item.customDesign || null,
        });
      }

      // 2. Fetch shipping rate from DB
      let shippingCost = 0;
      const shippingRate = await ShippingRate.findOne({
        $or: [{ governorate: customer.city }, { governorateAr: customer.city }],
      });
      if (shippingRate) {
        shippingCost = shippingRate.cost;
      }

      // 3. Apply coupon from DB
      let discount = 0;
      let appliedCoupon = null;
      if (couponCode) {
        appliedCoupon = await Coupon.findOne({
          code: couponCode.toUpperCase().trim(),
        });
        if (appliedCoupon) {
          // Strictly enforce one use per user account based on couponId
          if (req.user) {
            const couponTrackingId = getCouponUsageId(appliedCoupon);
            const userDoc = await User.findById(req.user._id).select("usedCouponIds");
            const hasUsedThisId = hasUsedCouponId(userDoc?.usedCouponIds, couponTrackingId);
            const hasUsedInTx = await PaymentTransaction.exists({
              userId: req.user._id,
              status: "paid",
              "paymentData.couponId": couponTrackingId,
            });
            if (hasUsedThisId || hasUsedInTx) {
              return res.status(400).json({
                error: "لقد تم استخدام هذا الكود مسبقاً",
              });
            }
          }
          discount = appliedCoupon.calculateDiscount(subTotal, "store", null, req.user?._id);
        }
      }

      // 4. Calculate Final Total
      const finalTotal = Math.max(0, subTotal + shippingCost - discount);

      // 100% Free Order: Complete immediately without payment gateway
      if (finalTotal === 0) {
        const order = await Order.create({
          userId: req.user._id,
          customer,
          items: finalItems,
          totalAmount: 0,
          shippingCost,
          discount,
          status: "received",
          paymentMethod: "free",
          paymentMethodName: "مجاني / Free",
          paymentStatus: "paid",
        });
        await processCustomCardsForOrder(order);

        if (appliedCoupon && discount > 0) {
          const cTrackId = getCouponUsageId(appliedCoupon);

          appliedCoupon.usedCount = (appliedCoupon.usedCount || 0) + 1;
          if (!appliedCoupon.usedBy) appliedCoupon.usedBy = [];
          if (!appliedCoupon.usedBy.some((id) => id.toString() === req.user._id.toString())) {
            appliedCoupon.usedBy.push(req.user._id);
          }
          await appliedCoupon.save();

          await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { usedCouponIds: cTrackId },
          });
        }

        notifyUser(req.user._id.toString(), {
          type: "order_created",
          payload: { id: order._id, name: customer.name },
        });
        sendOrderEmail({
          email: customer.email || req.user.email,
          name: customer.name,
          orderNumber: order.orderNumber,
          items: finalItems,
          totalAmount: 0,
          shippingCost,
          discount,
          paymentMethod: "مجاني / Free",
          customerAddress: `${customer.address}, ${customer.city}`,
          status: "paid",
        }).catch((err) => {
          console.warn("[mail] Error sending order email:", err?.message || err);
        });

        return {
          status: 201,
          data: {
            success: true,
            isFree: true,
            message: "تم تأكيد طلبك المجاني بنجاح.",
            orderId: order._id,
            orderNumber: order.orderNumber,
            paymentMethod: "free",
          },
        };
      }

      if (paymentMethod === "cash_on_delivery") {
        // Prevent duplicate COD orders if user double clicks or server is slow
        const duplicateRecentCodOrder = await Order.findOne({
          userId: req.user._id,
          paymentMethod: "cash_on_delivery",
          totalAmount: finalTotal,
          createdAt: { $gte: new Date(Date.now() - 30 * 1000) }, // within last 30 seconds
        }).sort({ createdAt: -1 });

        if (duplicateRecentCodOrder) {
          return {
            status: 200,
            data: {
              message: "Cash-on-delivery order received.",
              orderId: duplicateRecentCodOrder._id,
              orderNumber: duplicateRecentCodOrder.orderNumber,
              paymentMethod: duplicateRecentCodOrder.paymentMethod,
            },
          };
        }

        const order = await Order.create({
          userId: req.user._id,
          customer,
          items: finalItems,
          totalAmount: finalTotal,
          shippingCost,
          discount,
          status: "received",
          paymentMethod: "cash_on_delivery",
          paymentMethodName: "Cash on delivery",
          paymentStatus: "pending",
        });
        await processCustomCardsForOrder(order);

        if (appliedCoupon && discount > 0) {
          const cTrackId = getCouponUsageId(appliedCoupon);

          appliedCoupon.usedCount += 1;
          if (!appliedCoupon.usedBy) appliedCoupon.usedBy = [];
          if (!appliedCoupon.usedBy.some((id) => id.toString() === req.user._id.toString())) {
            appliedCoupon.usedBy.push(req.user._id);
          }
          await appliedCoupon.save();

          await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { usedCouponIds: cTrackId },
          });
        }

        notifyUser(req.user._id.toString(), {
          type: "order_created",
          payload: { id: order._id, name: customer.name },
        });
        sendOrderEmail({
          email: customer.email || req.user.email,
          name: customer.name,
          orderNumber: order.orderNumber,
          items: finalItems,
          totalAmount: finalTotal,
          shippingCost,
          discount,
          paymentMethod: "Cash on delivery",
          customerAddress: `${customer.address}, ${customer.city}`,
          status: "cash_on_delivery",
        }).catch((err) => {
          console.warn("[mail] Error sending order email:", err?.message || err);
        });

        return {
          status: 201,
          data: {
            message: "Cash-on-delivery order received.",
            orderId: order._id,
            orderNumber: order.orderNumber,
            paymentMethod: order.paymentMethod,
          },
        };
      }

      // For online payment: if there is an existing valid draft created recently for this user with the same amount, reuse it instead of creating duplicates
      let orderDraft = await OrderDraft.findOne({
        userId: req.user._id,
        totalAmount: finalTotal,
        expiresAt: { $gt: new Date() },
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      }).sort({ createdAt: -1 });

      if (!orderDraft) {
        orderDraft = await OrderDraft.create({
          userId: req.user._id,
          customer,
          items: finalItems,
          totalAmount: finalTotal,
          shippingCost,
          discount,
          couponId: appliedCoupon && discount > 0 ? getCouponUsageId(appliedCoupon) : null,
          paymentMethod: "online",
        });
      }

      return {
        status: 201,
        data: {
          message: "Checkout prepared. Complete payment to place the order.",
          orderId: orderDraft._id,
          orderNumber: orderDraft.orderNumber,
          amount: finalTotal,
        },
      };
    });

    return res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to create order." });
  }
};
