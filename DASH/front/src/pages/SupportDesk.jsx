import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  Send,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  User as UserIcon,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { adminFetch } from "../services/adminApi.js";
import { io } from "socket.io-client";
import { getBackendUrl } from "../api/client.js";

export default function SupportDesk() {
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const activeTicketRef = useRef(null);
  const [unreadTabCount, setUnreadTabCount] = useState(0);

  const scrollToBottom = (smooth = false) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  };

  useEffect(() => {
    const siteName = localStorage.getItem("admin_site_name") || "Thenith";
    const titleBase = `مكتب الدعم الفني | ${siteName}`;
    if (unreadTabCount > 0) {
      document.title = `(${unreadTabCount}) ${titleBase}`;
    } else {
      document.title = titleBase;
    }
  }, [unreadTabCount]);

  useEffect(() => {
    const handleFocus = () => setUnreadTabCount(0);
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    activeTicketRef.current = activeTicket;
  }, [activeTicket]);

  useEffect(() => {
    const adminToken = localStorage.getItem("admin_token");
    const newSocket = io(
      getBackendUrl(),
      {
        auth: { adminToken },
      },
    );
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("joinAdmin");
    });

    newSocket.on("customerServiceUpdated", (updatedTicket) => {
      setTickets((prev) => {
        const exists = prev.find((t) => t._id === updatedTicket._id);
        if (exists) {
          return prev
            .map((t) => (t._id === updatedTicket._id ? updatedTicket : t))
            .sort(
              (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt),
            );
        } else {
          return [updatedTicket, ...prev];
        }
      });
      if (
        activeTicketRef.current &&
        activeTicketRef.current._id === updatedTicket._id
      ) {
        setActiveTicket(updatedTicket);
      }
    });

    newSocket.on("newMessage", (message) => {
      const conversationId = message.customerService || message.conversation || message.ticket;
      const isCurrentChat =
        activeTicketRef.current &&
        activeTicketRef.current._id === conversationId;
      const soundId = isCurrentChat
        ? "admin-notify-inchat"
        : "admin-notify-main";

      if (message.senderModel === "Guest" || message.senderModel === "User") {
        if (document.hidden) {
          setUnreadTabCount((prev) => prev + 1);
        }

        const audioEl =
          document.getElementById(soundId) ||
          new Audio("/sounds/digital-notification.mp3");
        audioEl.volume = 0.8;
        audioEl
          .play()
          .catch((e) => {});

        if ("Notification" in window && Notification.permission === "granted") {
          if (document.hidden || !isCurrentChat) {
            new Notification("رسالة جديدة من عميل", {
              body: message.content,
              icon: "/favicon.ico",
            });
          }
        }
      }

      setMessages((prev) => {
        if (
          activeTicketRef.current &&
          conversationId === activeTicketRef.current._id
        ) {
          if (!prev.find((m) => m._id === message._id)) {
            return [...prev, message];
          }
        }
        return prev;
      });
    });

    newSocket.on("customerServiceStatusChanged", (updatedTicket) => {
      setTickets((prev) =>
        prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t)),
      );
      if (
        activeTicketRef.current &&
        activeTicketRef.current._id === updatedTicket._id
      ) {
        if (updatedTicket.status === "resolved") {
          setActiveTicket(null);
        } else {
          setActiveTicket(updatedTicket);
        }
      }
    });
    newSocket.on("ticketStatusChanged", (updatedTicket) => {
      setTickets((prev) =>
        prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t)),
      );
      if (
        activeTicketRef.current &&
        activeTicketRef.current._id === updatedTicket._id
      ) {
        if (updatedTicket.status === "resolved") {
          setActiveTicket(null);
        } else {
          setActiveTicket(updatedTicket);
        }
      }
    });

    loadTickets();
    const ticketsInterval = setInterval(loadTickets, 3000);

    return () => {
      clearInterval(ticketsInterval);
      newSocket.close();
    };
  }, []);

  // Update messages if active ticket changes, but do it carefully to avoid stale closures
  useEffect(() => {
    if (!activeTicket) return;

    loadMessages(activeTicket._id);

    const joinRoom = () => {
      socket?.emit("joinTicket", activeTicket._id);
      socket?.emit("joinCustomerService", activeTicket._id);
    };

    joinRoom();
    socket?.on("connect", joinRoom);

    return () => {
      socket?.off("connect", joinRoom);
    };
  }, [activeTicket, socket]);

  // Gentle background sync fallback for active chat
  useEffect(() => {
    if (!activeTicket?._id) return undefined;
    const interval = setInterval(() => {
      adminFetch(`/admin/customerServices/${activeTicket._id}/messages`)
        .then((data) => {
          if (Array.isArray(data)) {
            setMessages((prev) => {
              const missing = data.filter((m) => !prev.some((p) => p._id === m._id));
              if (missing.length > 0) {
                return [...prev, ...missing];
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    }, 3500);

    return () => clearInterval(interval);
  }, [activeTicket?._id]);

  useEffect(() => {
    if (activeTicket && messages.length > 0) {
      scrollToBottom(false);
      const raf = requestAnimationFrame(() => scrollToBottom(false));
      const t1 = setTimeout(() => scrollToBottom(false), 50);
      const t2 = setTimeout(() => scrollToBottom(false), 150);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [messages, activeTicket?._id]);

  const loadTickets = async () => {
    try {
      const data = await adminFetch("/admin/customerServices");
      setTickets(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (ticketId) => {
    try {
      const data = await adminFetch(
        `/admin/customerServices/${ticketId}/messages`,
      );
      setMessages(data);
      // Clear local unread count
      setTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? { ...t, unreadAdmin: 0 } : t)),
      );
    } catch (error) {
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeTicket) return;

    const content = newMessage;
    setNewMessage("");

    try {
      const sentMessage = await adminFetch(
        `/admin/customerServices/${activeTicket._id}/messages`,
        {
          method: "POST",
          data: { content },
        },
      );

      setMessages((prev) => {
        if (!prev.find((m) => m._id === sentMessage._id)) {
          return [...prev, sentMessage];
        }
        return prev;
      });
    } catch (error) {
      alert("فشل إرسال الرسالة");
      setNewMessage(content);
    }
  };

  const updateStatus = async (status) => {
    if (!activeTicket) return;
    try {
      await adminFetch(`/admin/customerServices/${activeTicket._id}/status`, {
        method: "PUT",
        data: { status },
      });
      if (status === "resolved") {
        setActiveTicket(null);
      }
    } catch (error) {
      alert("فشل تحديث الحالة");
    }
  };
  const [filter, setFilter] = useState("all");

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const filteredTickets = tickets.filter(ticket => {
    if (filter === "all") return true;
    const isPaid = ticket.user?.planType === "paid";
    return filter === "paid" ? isPaid : !isPaid;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2 px-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          الكل
        </button>
        <button
          onClick={() => setFilter("paid")}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${filter === "paid" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          باقة مدفوعة
        </button>
        <button
          onClick={() => setFilter("free")}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${filter === "free" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          مجاني / زائر
        </button>
      </div>

      <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
        {/* Sidebar - Tickets List */}
        <div className="w-1/3 border-s border-slate-200 flex flex-col bg-slate-50/50">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h2 className="font-bold text-lg text-slate-800">
              المحادثات المباشرة
            </h2>
            <p className="text-sm text-slate-500">
              {filteredTickets.length} محادثة معروضة
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">
                لا توجد محادثات حتى الآن.
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <button
                  key={ticket._id}
                  onClick={() => {
                    if (
                      "Notification" in window &&
                      Notification.permission === "default"
                    ) {
                      Notification.requestPermission();
                    }
                    setActiveTicket(ticket);
                  }}
                  className={`w-full text-end p-4 border-b border-slate-100 hover:bg-slate-100 transition-colors flex flex-col gap-2 relative ${activeTicket?._id === ticket._id ? "bg-indigo-50 hover:bg-indigo-50" : ""}`}
                >
                  {activeTicket?._id === ticket._id && (
                    <div className="absolute end-0 top-0 bottom-0 w-1 bg-indigo-500" />
                  )}

                  <div className="flex justify-between items-start">
                    <div className="font-bold text-slate-800 flex flex-wrap items-center gap-2">
                      {ticket.name}
                      {ticket.user ? (
                        <>
                          <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full">
                            مسجل
                          </span>
                          <span className={`${ticket.user.planType === 'paid' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'} text-[10px] px-2 py-0.5 rounded-full`}>
                            {ticket.user.planName}
                          </span>
                        </>
                    ) : (
                      <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full">
                        زائر
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium ">
                    {new Date(ticket.lastMessageAt).toLocaleTimeString(
                      "ar-EG-u-nu-latn",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center w-full">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-md ${ticket.status === "open" ? "bg-amber-100 text-amber-700" : ticket.status === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}
                  >
                    {ticket.status === "open"
                      ? "مفتوحة"
                      : ticket.status === "resolved"
                        ? "تم الحل"
                        : ticket.status}
                  </span>

                  {ticket.unreadAdmin > 0 && (
                    <span className="bg-rose-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                      {ticket.unreadAdmin}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeTicket ? (
          <>
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">
                    {activeTicket.name}
                  </h3>
                  <div className="text-xs text-slate-500 flex gap-2">
                    <span>{activeTicket.email}</span>
                    {activeTicket.ipAddress && (
                      <span>• {activeTicket.ipAddress}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {activeTicket.status !== "resolved" && (
                  <button
                    onClick={() => updateStatus("resolved")}
                    className="flex items-center gap-1.5 text-sm font-bold bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> تحديد كمحلولة
                  </button>
                )}
              </div>
            </div>

            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30"
              style={{
                backgroundImage:
                  "radial-gradient(#e5e7eb 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            >
              {messages.map((msg) => {
                const isAdmin = msg.senderModel === "Admin";
                const isSystem = msg.senderModel === "System";

                if (isSystem) {
                  return (
                    <div key={msg._id} className="flex justify-center my-2">
                      <div className="bg-slate-200/60 text-slate-500 px-4 py-1.5 rounded-full text-xs font-bold border border-slate-200/80 shadow-sm flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg._id}
                    className={`flex ${isAdmin ? "justify-end" : "justify-start"} mb-3`}
                  >
                    <div className={`max-w-[70%] flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                      {/* Message Bubble */}
                      <div
                        className={`p-3.5 rounded-2xl ${
                          isAdmin
                            ? "bg-indigo-600 text-white rounded-ss-none shadow-sm"
                            : "bg-white border border-slate-200 text-slate-800 rounded-se-none shadow-sm"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        <div
                          className={`text-[10px] mt-1.5 text-end font-medium ${
                            isAdmin ? "text-indigo-200" : "text-slate-400"
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString("ar-EG-u-nu-latn", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      {/* Outside Bubble: Sender Name */}
                      <div className="text-[10px] mt-1 px-1 font-medium text-slate-500 select-none">
                        {isAdmin
                          ? (msg.senderName || (msg.senderId ? `@${msg.senderId}` : "مشرف الدعم"))
                          : (msg.senderName || activeTicket.name || "العميل")}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
              {activeTicket.status === "resolved" ? (
                <div className="text-center p-3 bg-slate-50 text-slate-500 rounded-xl font-bold flex items-center justify-center gap-2">
                  <AlertCircle className="w-5 h-5" /> المحادثة محلولة ومغلقة. لا
                  يمكنك إرسال رسائل.
                </div>
              ) : (
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="اكتب ردك هنا..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-indigo-600 text-white w-12 rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-5 h-5 -ml-1 rtl:rotate-180" />
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare className="w-16 h-16 mb-4 text-slate-200" />
            <p className="font-bold text-lg text-slate-500">
              اختر محادثة للبدء
            </p>
          </div>
        )}
      </div>
      </div>
      <audio
        id="admin-notify-main"
        src="/sounds/digital-notification.mp3"
        preload="auto"
      />
      <audio
        id="admin-notify-inchat"
        src="https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3"
        preload="auto"
      />
    </div>
  );
}
