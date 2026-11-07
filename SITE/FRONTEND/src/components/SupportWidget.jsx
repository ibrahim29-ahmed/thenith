import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useGlobalLanguage } from "../context/GlobalLanguageContext.jsx";
import {
  MessageCircle,
  X,
  Send,
  User as UserIcon,
  ShieldCheck,
  ArrowUp,
} from "lucide-react";
import { getAccessToken } from "../panel/services/authApi.js";
import api from "../api/index.js";
import { API_BASE_URL } from "../config/runtime.js";
import io from "socket.io-client";
import { useAuth } from "../context/AuthContext.jsx";
import { AnimatePresence, motion } from "motion/react";

export default function SupportWidget({ embedded = false, isVisible = true }) {
  const [isOpen, setIsOpen] = useState(embedded);
  const location = useLocation();
  const { t, language } = useGlobalLanguage();
  const { user, isAuthenticated } = useAuth();
  const isPanelRoute = location.pathname.startsWith("/u/");
  const isAr = language === "ar";

  useEffect(() => {
    if (embedded || isPanelRoute) return undefined;
    const handleOpenWidget = (e) => {
      e.preventDefault();
      setIsOpen(true);
    };
    window.addEventListener("open-support-widget", handleOpenWidget);
    return () =>
      window.removeEventListener("open-support-widget", handleOpenWidget);
  }, [embedded, isPanelRoute]);

  const [guestId, setGuestId] = useState(null);
  const [name, setName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadTabCount, setUnreadTabCount] = useState(0);

  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isOpenRef = useRef(isOpen);
  const hasAutoStarted = useRef(false);

  const isVisibleRef = useRef(isVisible);

  const scrollToBottom = (behavior = "auto") => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
  };

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen && isVisible) {
      setUnreadCount(0);
    }
  }, [isOpen, isVisible]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("support-unread", { detail: unreadCount }));
  }, [unreadCount]);

  useEffect(() => {
    if (unreadTabCount > 0) {
      const currentTitle = document.title.replace(/^\(\d+\)\s*/, "");
      document.title = `(${unreadTabCount}) ${currentTitle}`;
    } else {
      document.title = document.title.replace(/^\(\d+\)\s*/, "");
    }
  }, [unreadTabCount]);

  useEffect(() => {
    const handleFocus = () => setUnreadTabCount(0);
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Removed auto-start logic to always show the Start Chat button first

  useEffect(() => {
    if (!embedded && isPanelRoute) return undefined;
    const storageKey = embedded
      ? "thenith_support_panel_guest_id"
      : "thenith_support_guest_id";
    let storedId = localStorage.getItem(storageKey);
    if (!storedId) {
      storedId = "guest_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(storageKey, storedId);
    }
    setGuestId(storedId);

    const socketUrl =
      import.meta.env.VITE_BACKEND_URL ||
      (API_BASE_URL === "/api"
        ? undefined
        : API_BASE_URL.replace(/\/api\/?$/, ""));

    const token = getAccessToken();
    const newSocket = io(socketUrl, {
      path: "/socket.io",
      withCredentials: true,
      autoConnect: true,
      auth: {
        guestId: storedId,
        token,
      },
    });
    setSocket(newSocket);

    newSocket.on("newMessage", (msg) => {
      setMessages((prev) => {
        if (!prev.find((m) => m._id === msg._id)) {
          return [...prev, msg];
        }
        return prev;
      });

      if (
        msg.senderModel === "System" ||
        msg.senderModel === "Owner" ||
        msg.senderModel === "Admin"
      ) {
        const effectivelyHidden = document.hidden || !isVisibleRef.current;

        if (effectivelyHidden) {
          setUnreadTabCount((prev) => prev + 1);
          window.dispatchEvent(
            new CustomEvent("support-new-message", {
              detail: { content: msg.content, sender: msg.senderModel },
            })
          );
        }

        if (!isOpenRef.current || effectivelyHidden) {
          setUnreadCount((prev) => prev + 1);
          try {
            const mainAudio = document.getElementById("user-notify-main");
            if (mainAudio) {
              mainAudio.play().catch(() => { });
            }
          } catch (e) { }
        } else if (
          msg.senderModel !== "System" &&
          (msg.senderModel === "Owner" || msg.senderModel === "Admin")
        ) {
          try {
            const inChatAudio = document.getElementById("user-notify-inchat");
            if (inChatAudio) {
              inChatAudio.play().catch(() => { });
            }
          } catch (e) { }
        }
      }
    });

    newSocket.on("ticketStatusChanged", (updatedTicket) => {
      if (updatedTicket.status === "resolved") {
        setTicket(null);
        setMessages([]);
        if (!embedded) setIsOpen(false);
        if (!getAccessToken()) {
          localStorage.removeItem("thenith_support_guest_id");
          setGuestId(null);
        }
      } else {
        setTicket(updatedTicket);
      }
    });

    newSocket.on("customerServiceStatusChanged", (updatedTicket) => {
      if (updatedTicket.status === "resolved") {
        setTicket(null);
        setMessages([]);
        if (!embedded) setIsOpen(false);
        if (!getAccessToken()) {
          localStorage.removeItem("thenith_support_guest_id");
          setGuestId(null);
        }
      } else {
        setTicket(updatedTicket);
      }
    });

    newSocket.on("connect", () => {
      newSocket.emit("joinUserRoom");
    });
    newSocket.emit("joinUserRoom");

    newSocket.on("adminNotification", (notif) => {
      window.dispatchEvent(new CustomEvent("admin-push-notification", { detail: notif }));
      window.dispatchEvent(new CustomEvent("admin-push-toast", { detail: notif }));
    });

    return () => newSocket.disconnect();
  }, [embedded, isPanelRoute]);

  useEffect(() => {
    if (guestId && !ticket && (embedded || !isPanelRoute)) {
      resumeChat();
    }
  }, [guestId, embedded, isPanelRoute, ticket]);

  useEffect(() => {
    if (!socket || !ticket?._id) return;
    const joinRoom = () => {
      socket.emit("joinTicket", ticket._id);
      socket.emit("joinCustomerService", { customerServiceId: ticket._id, guestId });
    };
    joinRoom();
    socket.on("connect", joinRoom);
    return () => { socket.off("connect", joinRoom); };
  }, [socket, ticket?._id, guestId]);

  // Gentle background poll fallback when ticket is active
  useEffect(() => {
    if (!ticket?._id) return undefined;
    const pollInterval = setInterval(() => {
      api.support.getMessages(ticket._id, guestId || "").then((data) => {
        if (Array.isArray(data)) {
          setMessages((prev) => {
            const missing = data.filter((m) => !prev.some((p) => p._id === m._id));
            if (missing.length > 0) {
              missing.forEach((msg) => {
                if (msg.senderModel === "Admin" || msg.senderModel === "System" || msg.senderModel === "Owner") {
                  if (!isOpenRef.current) {
                    setUnreadCount((c) => c + 1);
                    try {
                      document.getElementById("user-notify-main")?.play().catch(() => {});
                    } catch (e) {}
                  }
                }
              });
              return [...prev, ...missing];
            }
            return prev;
          });
        }
      }).catch(() => {});
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [ticket?._id, guestId]);

  useEffect(() => {
    if (isVisible && isOpen && ticket) {
      scrollToBottom("auto");

      const raf = requestAnimationFrame(() => scrollToBottom("auto"));
      const t1 = setTimeout(() => scrollToBottom("auto"), 50);
      const t2 = setTimeout(() => scrollToBottom("auto"), 150);
      const t3 = setTimeout(() => scrollToBottom("auto"), 350);
      const t4 = setTimeout(() => scrollToBottom("auto"), 600);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, [messages, isOpen, isVisible, ticket?._id]);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => {
      if (isVisible && isOpen && ticket) {
        scrollToBottom("auto");
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [isVisible, isOpen, Boolean(ticket)]);

  const resumeChat = async () => {
    if (!guestId) return;
    try {
      const restoredTicket = await api.support.init({ guestId });
      if (restoredTicket && !restoredTicket.error && restoredTicket._id) {
        setTicket(restoredTicket);
        fetchMessages(restoredTicket._id);
      }
    } catch (e) {
    } finally {
      setIsInitializing(false);
    }
  };

  const startChat = async (e, autoName) => {
    if (e) e.preventDefault();
    const chatName = autoName || user?.name || user?.fullName || name;
    if (!chatName) return;
    try {
      setLoading(true);
      let currentGuestId = guestId;
      if (!currentGuestId) {
        currentGuestId = "guest_" + Math.random().toString(36).substr(2, 9);
        localStorage.setItem("thenith_support_guest_id", currentGuestId);
        setGuestId(currentGuestId);
      }
      const createdTicket = await api.support.init({
        name: chatName,
        guestId: currentGuestId,
        subject: t("support.newInquiry"),
      });
      if (createdTicket && !createdTicket.error && createdTicket._id) {
        setTicket(createdTicket);
        fetchMessages(createdTicket._id);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId) => {
    try {
      const data = await api.support.getMessages(ticketId, guestId || "");
      setMessages(data);
    } catch (e) { }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !ticket) return;
    const content = newMessage;
    setNewMessage("");
    try {
      const sentMessage = await api.support.sendMessage(ticket._id, content);
      setMessages((prev) => {
        if (!prev.find((m) => m._id === sentMessage._id)) {
          return [...prev, sentMessage];
        }
        return prev;
      });
    } catch (error) {
      setNewMessage(content);
    }
  };

  const shellClass = embedded
    ? "font-sans relative flex h-[min(72vh,760px)] min-h-[460px] w-full flex-col overflow-hidden rounded-2xl border border-white/60 dark:border-slate-600/40 bg-white/60 dark:bg-slate-900/80 shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-xl"
    : "font-sans fixed bottom-[86px] end-4 md:bottom-[96px] md:end-7 w-[calc(100vw-24px)] md:w-[380px] h-[600px] max-h-[75vh] bg-white/70 dark:bg-slate-900/80 backdrop-blur-[40px] rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-white/80 dark:border-slate-600/40 ring-1 ring-black/5 dark:ring-white/10 flex flex-col overflow-hidden origin-bottom-right z-[100]";

  return (
    <div className="global-support-widget" dir={isAr ? "rtl" : "ltr"}>
      <style>
        {`
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob { animation: blob 12s infinite alternate ease-in-out; }
          .animation-delay-2000 { animation-delay: 4s; }
          .animation-delay-4000 { animation-delay: 8s; }
        `}
      </style>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={shellClass}
            initial={!embedded ? { opacity: 0, scale: 0.9, y: 15 } : false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={!embedded ? { opacity: 0, scale: 0.9, y: 15 } : undefined}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Animated Mesh Background */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-25 dark:opacity-15">
              <div className="absolute top-[-20%] start-[-20%] w-[80%] h-[80%] bg-indigo-300/50 dark:bg-indigo-700/40 rounded-full mix-blend-normal blur-[60px] animate-blob" />
              <div className="absolute top-[-20%] end-[-20%] w-[80%] h-[80%] bg-rose-300/50 dark:bg-rose-700/30 rounded-full mix-blend-normal blur-[60px] animate-blob animation-delay-2000" />
              <div className="absolute bottom-[-20%] start-[10%] w-[80%] h-[80%] bg-sky-300/50 dark:bg-sky-700/30 rounded-full mix-blend-normal blur-[60px] animate-blob animation-delay-4000" />
            </div>

            {/* Header */}
            <div className="bg-gradient-to-b from-white/80 to-transparent dark:from-slate-800/80 dark:to-transparent text-slate-900 dark:text-white px-6 pt-5 pb-8 flex flex-col relative shrink-0 z-10">
              <div className="flex justify-between items-start mb-0 relative z-10">
                <div className="flex flex-col">
                  <span className="text-slate-900 dark:text-white font-black text-lg tracking-tight mb-2">Thenith</span>
                  <h3 className="font-bold text-2xl flex items-center gap-2 text-slate-900 dark:text-white mb-1">
                    {isAuthenticated && user
                      ? `${isAr ? "أهلاً" : "Hello"} ${user.name?.split(" ")[0] || user.fullName?.split(" ")[0] || ""} 👋`
                      : isAr
                        ? "أهلاً 👋"
                        : "Hello there 👋"}
                  </h3>
                  <h4 className="font-bold text-xl text-slate-900 dark:text-white">
                    {isAr ? " نقدر نساعدك ازاي؟" : "How can we help?"}
                  </h4>
                </div>
                {!embedded && (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label={t("support.title")}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-slate-100/70 dark:bg-slate-700/60 hover:bg-slate-200/80 dark:hover:bg-slate-600/70 rounded-full p-2 backdrop-blur-md shadow-sm"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium relative z-10 mt-3">
                {isAr ? "فريق Thenith هنا دايماً" : "Thenith support is always here"}
              </p>
            </div>

            {/* Chat Area */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto scrollbar-hide bg-transparent flex flex-col relative p-4 z-10"
            >
              {!ticket ? (
                <div className="flex-1 flex flex-col justify-center max-w-[320px] mx-auto w-full">
                  <div className="bg-white/80 dark:bg-slate-800/80 p-6 rounded-[24px] shadow-xl dark:shadow-[0_15px_35px_rgba(0,0,0,0.25)] border border-white/60 dark:border-slate-600/50 ring-1 ring-slate-900/5 dark:ring-white/5">
                    {loading || isInitializing ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-6 text-slate-600 dark:text-slate-300">
                        <div className="h-10 w-10 border-2 border-slate-200 dark:border-slate-600 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
                        <span className="text-sm font-medium">
                          {t("support.loading")}
                        </span>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => startChat(e, user?.name || user?.fullName)}
                        className="space-y-4"
                      >
                        <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">
                          {t("support.welcome")}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                          {t("support.welcomeDesc")}.
                        </p>
                        {!user && (
                          <input
                            type="text"
                            required
                            placeholder={t("support.name")}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-700/60 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                          />
                        )}
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold rounded-xl px-4 py-3 text-sm hover:bg-black dark:hover:bg-indigo-500 transition-colors shadow-lg disabled:opacity-50"
                        >
                          {t("support.startChat")}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 font-bold my-4">
                    {t("support.chatActive")}
                  </div>
                  {messages.map((msg, i) => {
                    const isGuest =
                      msg.senderModel === "Guest" || msg.senderModel === "User";
                    const isSystem = msg.senderModel === "System";

                    if (isSystem) {
                      return (
                        <div key={msg._id || i} className="flex justify-center my-3">
                          <div className="bg-slate-200/60 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200/60 dark:border-slate-600/40">
                            {msg.content}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg._id || i}
                        className={`flex ${isGuest ? "justify-start" : "justify-end"} mb-3 w-full`}
                      >
                        <div className={`max-w-[85%] flex flex-col ${isGuest ? "items-start" : "items-end"}`}>
                          {/* Message Bubble */}
                          <div
                            className={`p-3.5 text-sm ${
                              isGuest
                                ? "bg-black text-white rounded-[20px] rounded-se-[4px] shadow-md"
                                : "bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-100 rounded-[20px] rounded-ss-[4px] border border-slate-200/70 dark:border-slate-600/40 shadow-sm"
                            }`}
                          >
                            <p
                              className="whitespace-pre-wrap break-words leading-relaxed text-start"
                              dir="auto"
                            >
                              {msg.content}
                            </p>
                            <div
                              className={`text-[10px] mt-1.5 text-end font-medium ${
                                isGuest
                                  ? "text-slate-400"
                                  : "text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              {new Date(msg.createdAt || Date.now()).toLocaleTimeString(
                                "ar-EG-u-nu-latn",
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </div>
                          </div>

                          {/* Outside Bubble: Sender Name */}
                          {!isGuest && (
                            <div className="text-[10px] mt-1 px-1 font-medium text-slate-500 dark:text-slate-400 select-none">
                              {msg.senderName || (isAr ? "فريق الدعم الفني" : "Support Team")}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            {ticket && (
              <div className="p-4 bg-white/60 dark:bg-slate-800/70 border-t border-slate-200/50 dark:border-slate-700/50 shrink-0 relative z-10">
                <form
                  onSubmit={sendMessage}
                  className="flex gap-2 bg-white/95 dark:bg-slate-700/90 rounded-full p-1 ps-4 border border-white/60 dark:border-slate-600/60 shadow-md dark:shadow-[0_5px_15px_rgba(0,0,0,0.2)] ring-1 ring-slate-900/5 dark:ring-white/5"
                >
                  <input
                    type="text"
                    placeholder={t("support.typeMessage")}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 bg-transparent text-slate-900 dark:text-white text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-slate-900 dark:bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black dark:hover:bg-indigo-500 transition-colors disabled:opacity-50 shrink-0"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!embedded &&
        !location.pathname.startsWith("/u") &&
        !location.pathname.startsWith("/login") &&
        !location.pathname.startsWith("/signup") &&
        !(location.pathname === "/p" || location.pathname.startsWith("/p/")) &&
        !location.pathname.startsWith("/admin") && (
          <button
            onClick={() => {
              if (
                !isOpen &&
                "Notification" in window &&
                Notification.permission === "default"
              ) {
                Notification.requestPermission();
              }
              setIsOpen(!isOpen);
            }}
            className="fixed bottom-5 end-5 md:bottom-7 md:end-7 z-[100] w-14 h-14 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border border-white/80 dark:border-slate-600/60 text-slate-900 dark:text-white rounded-full flex items-center justify-center shadow-[0_15px_35px_rgba(0,0,0,0.2)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.4)] ring-1 ring-black/5 dark:ring-white/10 hover:bg-white dark:hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all group"
          >
            {isOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <MessageCircle className="w-6 h-6" />
            )}

            {!isOpen && unreadCount > 0 && (
              <span className="absolute -top-1 -end-1 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800 shadow-sm animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>
        )}
      <audio id="user-notify-main" src="/sounds/main-notification.mp3" preload="none" />
      <audio
        id="user-notify-inchat"
        src="https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3"
        preload="none"
      />
    </div>
  );
}
