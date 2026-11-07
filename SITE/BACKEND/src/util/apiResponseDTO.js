/**
 * src/util/apiResponseDTO.js
 * Explicit response sanitization for Mongoose models to prevent data leaks.
 */

// Format Order responses explicitly
export function sanitizeOrder(order) {
  const o = typeof order.toObject === "function" ? order.toObject() : order;
  return {
    id: o._id ? o._id.toString() : undefined,
    _id: o._id ? o._id.toString() : undefined,
    orderNumber: o.orderNumber,
    customer: o.customer,
    items: o.items,
    totalAmount: o.totalAmount,
    shippingCost: o.shippingCost,
    discount: o.discount,
    status: o.status,
    returnReason: o.returnReason,
    paymentMethod: o.paymentMethod,
    paymentMethodName: o.paymentMethodName,
    paymentStatus: o.paymentStatus,
    paidAt: o.paidAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

// Format CustomerService responses explicitly
export function sanitizeCustomerService(cs) {
  const o = typeof cs.toObject === "function" ? cs.toObject() : cs;
  return {
    id: o._id ? o._id.toString() : undefined,
    _id: o._id ? o._id.toString() : undefined,
    name: o.name,
    email: o.email,
    status: o.status,
    unreadAdmin: o.unreadAdmin,
    unreadUser: o.unreadUser,
    lastMessageAt: o.lastMessageAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

// Format ChatMessage responses explicitly
export function sanitizeChatMessage(msg) {
  const o = typeof msg.toObject === "function" ? msg.toObject() : msg;
  return {
    id: o._id ? o._id.toString() : undefined,
    _id: o._id ? o._id.toString() : undefined,
    customerServiceId: o.customerService ? o.customerService.toString() : undefined,
    senderModel: o.senderModel,
    senderId: o.senderId,
    senderName: o.senderName || (o.senderModel === "Admin" ? (o.senderId && o.senderId !== "admin" ? o.senderId : "فريق الدعم") : undefined),
    content: o.content,
    isRead: o.isRead,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

// Format UserNotification responses explicitly
export function sanitizeNotification(notif) {
  const o = typeof notif.toObject === "function" ? notif.toObject() : notif;
  return {
    id: o._id ? o._id.toString() : undefined,
    _id: o._id ? o._id.toString() : undefined,
    type: o.type,
    category: o.category || "general",
    priority: o.priority || "normal",
    title: o.title,
    message: o.message,
    link: o.link,
    actionLabel: o.actionLabel || "",
    read: o.read,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}
