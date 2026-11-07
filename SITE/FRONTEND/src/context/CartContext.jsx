import React, { createContext, useContext, useState, useEffect } from "react";

import { deleteCardDraftImages } from "../utils/customCardStorage.js";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("thenith_cart");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Keep only items that have rawName (new format) to ensure multilingual support works
        const validItems = parsed.filter(item => item.rawName);
        return validItems;
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem("thenith_cart", JSON.stringify(cart));
    } catch (e) {
      console.warn("[cart] Could not save to localStorage quota:", e);
    }
  }, [cart]);

  // Sync cart across tabs and clear events
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "thenith_cart") {
        if (!e.newValue || e.newValue === "[]") {
          setCart([]);
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            setCart(Array.isArray(parsed) ? parsed : []);
          } catch {}
        }
      }
    };
    const handleCartCleared = () => {
      setCart([]);
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("cart-cleared", handleCartCleared);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cart-cleared", handleCartCleared);
    };
  }, []);

  const addToCart = (product, quantity = 1, customDesign = null, explicitCartItemId = null, chosenColor = null) => {
    const isCustomizable = Boolean(product.isCustomizable);
    const isCustom = Boolean(customDesign || product.customDesign);

    // Customizable products can NEVER be added directly without going through the 3D customizer
    if (isCustomizable && !isCustom) {
      window.location.href = `/custom-card?productId=${product.id}`;
      return false;
    }

    const resolvedCustom = customDesign || product.customDesign || null;
    let resolvedColor = chosenColor || product.selectedColor || product.color || null;

    // Resolve selected image and its unique ID
    let selectedImage = product.selectedImage || "";
    let selectedImageId = product.selectedImageId || "";

    if (!selectedImage && Array.isArray(product.images) && product.images.length > 0) {
      const idx = typeof product.activeImageIndex === "number" ? product.activeImageIndex : 0;
      const targetImg = product.images[idx] || product.images[0];
      if (typeof targetImg === "object" && targetImg !== null) {
        selectedImage = targetImg.url || "";
        selectedImageId = targetImg.id || "";
      } else if (typeof targetImg === "string") {
        selectedImage = targetImg;
      }
    }

    // If a color was chosen and it has an associated image URL:
    if (!selectedImage && resolvedColor && typeof resolvedColor === "object" && resolvedColor.image) {
      selectedImage = resolvedColor.image;
    }

    if (!selectedImage) {
      selectedImage = resolvedCustom?.image || product.image || "";
    }

    // If color was not given (or was just a string name), attempt to resolve full color object from product.colors
    if (selectedImage && (!resolvedColor || typeof resolvedColor === "string")) {
      const matchByImg = Array.isArray(product.colors)
        ? product.colors.find((c) => c.image === selectedImage)
        : null;
      if (matchByImg) {
        resolvedColor = matchByImg;
      } else if (typeof resolvedColor === "string") {
        const matchByName = Array.isArray(product.colors)
          ? product.colors.find((c) => c.name === resolvedColor || c.colorCode === resolvedColor)
          : null;
        if (matchByName) {
          resolvedColor = matchByName;
        }
      }
    }

    // Build unique variant key so different colors / images don't overwrite each other in the cart
    const colorKey = typeof resolvedColor === "object" && resolvedColor !== null
      ? (resolvedColor.colorCode || resolvedColor.name || "")
      : String(resolvedColor || "");
    const imgKey = selectedImage ? selectedImage.split("/").pop()?.replace(/\.[^/.]+$/, "") || "" : "";
    const variantKey = selectedImageId || (colorKey || imgKey ? `${colorKey}_${imgKey}`.replace(/[^a-zA-Z0-9_-]/g, "") : "");
    const cartItemId = explicitCartItemId || (isCustom ? `${product.id}_${Date.now()}` : (variantKey ? `${product.id}_${variantKey}` : product.id));

    const item = {
      id: product.id,
      cartItemId,
      name: product.name,
      rawName: product.rawName,
      price: Number(product.price || 0),
      currency: product.currency || "EGP",
      image: selectedImage || resolvedColor?.image || resolvedCustom?.image || product.image || "",
      selectedImage: selectedImage || product.image || "",
      selectedImageId: selectedImageId || "",
      sku: product.sku || "",
      color: resolvedColor,
      customDesign: resolvedCustom,
    };

    setCart((prev) => {
      if (!isCustom) {
        const existing = prev.find((p) => (p.cartItemId || p.id) === item.cartItemId && !p.customDesign);
        if (existing) {
          return prev.map((p) =>
            (p.cartItemId || p.id) === item.cartItemId && !p.customDesign
              ? { ...p, ...item, quantity: p.quantity + quantity }
              : p,
          );
        }
      }
      return [...prev, { ...item, quantity: Math.max(1, quantity) }];
    });
  };

  const removeFromCart = (id) => {
    // Delete any high-res draft from IndexedDB
    deleteCardDraftImages(id).catch(() => {});

    setCart((prev) =>
      prev.filter((p) => {
        // 1. Exact match on unique cartItemId
        if (p.cartItemId && p.cartItemId === id) return false;
        // 2. Exact match on composite primary key
        const primaryKey = p.cartItemId || p.id;
        if (primaryKey === id) return false;
        // 3. Match standard product id when no custom cartItemId is present
        if (!p.cartItemId && p.id === id) return false;
        // 4. Fallback if product id was passed and exactly one item of this id exists
        if (p.id === id && !String(id).includes("_") && prev.filter((x) => x.id === id).length === 1) return false;
        return true;
      })
    );
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) return removeFromCart(id);
    setCart((prev) =>
      prev.map((p) => ((p.cartItemId || p.id) === id ? { ...p, quantity } : p)),
    );
  };

  const clearCart = () => {
    try {
      if (Array.isArray(cart)) {
        cart.forEach((item) => {
          const id = item.cartItemId || item.id;
          if (id) deleteCardDraftImages(id).catch(() => {});
        });
      }
    } catch (e) {}

    setCart([]);
    try {
      localStorage.removeItem("thenith_cart");
      localStorage.setItem("thenith_cart", JSON.stringify([]));
      localStorage.removeItem("thenith_custom_card_studio_state_v2");
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("cart-cleared"));
    } catch (e) {
      console.warn("[cart] clearCart error:", e);
    }
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
