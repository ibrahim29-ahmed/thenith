import { toast as hotToast } from "react-hot-toast";

import React from "react";

const messageCounts = new Map();
const messageTimeouts = new Map();

function extractMessage(msg) {
  if (typeof msg === "string") return msg;
  if (!msg) return "";
  if (typeof msg === "object") {
    if (React.isValidElement(msg)) return msg;
    if (typeof msg.message === "string") return msg.message;
    if (typeof msg.error === "string") return msg.error;
    if (msg.error && typeof msg.error.message === "string") return msg.error.message;
    try {
      return JSON.stringify(msg);
    } catch {
      return String(msg);
    }
  }
  return String(msg);
}

function show(rawMsg, opts, method) {
  const msg = extractMessage(rawMsg);
  const key = typeof msg === "string" ? msg : "custom";
  if (key === "custom") {
     return method ? hotToast[method](msg, opts) : hotToast(msg, opts);
  }

  const count = (messageCounts.get(key) || 0) + 1;
  messageCounts.set(key, count);

  if (messageTimeouts.has(key)) clearTimeout(messageTimeouts.get(key));
  messageTimeouts.set(key, setTimeout(() => {
    messageCounts.delete(key);
    messageTimeouts.delete(key);
  }, 4000));

  const displayMsg = count > 1 ? `${msg} (${count})` : msg;
  // Use the key as the id so react-hot-toast replaces the toast in-place!
  return method ? hotToast[method](displayMsg, { ...opts, id: key }) : hotToast(displayMsg, { ...opts, id: key });
}

// Create a wrapper that behaves exactly like the original toast but deduplicates
const toast = Object.assign(
  (msg, opts) => show(msg, opts, null),
  hotToast,
  {
    success: (msg, opts) => show(msg, opts, 'success'),
    error: (msg, opts) => show(msg, opts, 'error'),
    loading: (msg, opts) => show(msg, opts, 'loading'),
  }
);

export { toast };
export default toast;
