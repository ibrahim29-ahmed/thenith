import React from "react";
import { Trash2, Plus, Minus, CreditCard } from "lucide-react";
import { useCart } from "../../../context/CartContext.jsx";
import { formatMoney } from "../../../pages/store/storeApi.js";
import { motion } from "motion/react";
import toast from "react-hot-toast";

export default function PanelCart({ t, onCheckout }) {
  const { cart, updateQuantity, removeFromCart, totalPrice } = useCart();
  const isArabic = t("home") === "الرئيسية";

  const handleRemoveItem = async (item) => {
    const itemName = item.rawName?.[isArabic ? "ar" : "en"] || item.rawName?.ar || item.name;
    const Swal = (await import("sweetalert2")).default;
    const result = await Swal.fire({
      title: isArabic ? "حذف من السلة" : "Remove from cart",
      text: isArabic
        ? `هل أنت متأكد من حذف "${itemName || "هذا العنصر"}" من سلة المشتريات؟`
        : `Are you sure you want to remove "${itemName || "this item"}" from your cart?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      confirmButtonText: isArabic ? "نعم، احذف" : "Yes, remove",
      cancelButtonText: isArabic ? "إلغاء" : "Cancel",
      reverseButtons: isArabic,
      customClass: {
        popup: "rounded-3xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800",
        title: "text-slate-800 dark:text-white font-black",
        htmlContainer: "text-slate-600 dark:text-slate-300 text-sm",
        confirmButton: "rounded-xl font-bold px-5 py-2.5",
        cancelButton: "rounded-xl font-bold px-5 py-2.5",
      },
    });

    if (result.isConfirmed) {
      removeFromCart(item.cartItemId || item.id);
      toast.success(isArabic ? "تم حذف العنصر من السلة" : "Item removed from cart");
    }
  };

  const handleDecrement = (item) => {
    const itemId = item.cartItemId || item.id;
    if (item.quantity <= 1) {
      handleRemoveItem(item);
    } else {
      updateQuantity(itemId, item.quantity - 1);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-slate-200 shadow-sm dark:bg-slate-950 dark:border-slate-800">
        <h2 className="text-2xl font-bold mb-4 text-slate-700 dark:text-slate-200">
          {isArabic ? "سلة المشتريات فارغة" : "Your cart is empty"}
        </h2>
        <p className="text-slate-500 mb-8 dark:text-slate-400">
          {isArabic ? "لم تقم بإضافة أي منتجات بعد." : "You haven't added any products yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
      <div className="lg:col-span-2 space-y-4">
        {cart.map((item) => (
          <motion.div
            layout
            key={item.cartItemId || item.id}
            className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-6 dark:bg-slate-950 dark:border-slate-800"
          >
            <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-2xl p-2 flex items-center justify-center">
              {item.customDesign?.image || item.selectedImage || item.image ? (
                <img
                  src={item.customDesign?.image || item.selectedImage || item.image}
                  alt={item.rawName?.[isArabic ? 'ar' : 'en'] || item.rawName?.ar || item.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              )}
            </div>
            
            <div className="flex-1 text-center sm:text-start">
              <h3 className="font-bold text-lg mb-0.5 text-slate-900 dark:text-white">
                {item.rawName?.[isArabic ? 'ar' : 'en'] || item.rawName?.ar || item.name}
              </h3>
              {item.color && (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 my-1">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                    style={{ backgroundColor: item.color.colorCode || "#000" }}
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {typeof item.color.name === "object"
                      ? (item.color.name[isArabic ? 'ar' : 'en'] || item.color.name.ar || item.color.name.en)
                      : (item.color.name || item.color.colorCode)}
                  </span>
                </div>
              )}
              {item.customDesign && (
                <p className="text-xs text-indigo-500 font-semibold mb-1">
                  {isArabic ? "تصميم مخصص باسم: " : "Custom design: "}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.customDesign.name || (isArabic ? "تصميم كامل بدون نصوص" : "Artwork")}</span>
                  {item.customDesign.jobTitle ? ` (${item.customDesign.jobTitle})` : ""}
                </p>
              )}
              <p className="text-indigo-600 dark:text-indigo-400 font-bold">
                {formatMoney(item.price, item.currency)}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-full px-4 py-2 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => handleDecrement(item)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold w-4 text-center text-slate-900 dark:text-white">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.cartItemId || item.id, item.quantity + 1)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveItem(item)}
                className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-2 rounded-full transition-colors cursor-pointer"
                title={isArabic ? "حذف من السلة" : "Remove"}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm h-fit sticky top-6">
        <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">
          {isArabic ? "ملخص الطلب" : "Order Summary"}
        </h2>
        
        <div className="space-y-4 mb-6 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="flex justify-between">
            <span>{isArabic ? "المجموع الفرعي" : "Subtotal"}</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {formatMoney(totalPrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{isArabic ? "الشحن" : "Shipping"}</span>
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              {isArabic ? "يحدد لاحقاً" : "Calculated at checkout"}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between text-xl font-bold text-slate-900 dark:text-white mb-8">
          <span>{isArabic ? "الإجمالي" : "Total"}</span>
          <span className="text-indigo-600 dark:text-indigo-400">
            {formatMoney(totalPrice)}
          </span>
        </div>
        
        <button
          onClick={onCheckout}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
        >
          {isArabic ? "إتمام الطلب" : "Proceed to Checkout"}
          <CreditCard className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
