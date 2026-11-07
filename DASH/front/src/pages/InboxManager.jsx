import { useState, useEffect, useCallback } from "react";
import {
  fetchMessages,
  markMessageRead,
  deleteMessage,
} from "../services/adminApi.js";
import {
  Loader2,
  MailOpen,
  Mail,
  Trash2,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
} from "lucide-react";

export default function InboxManager() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMessages();
      setMessages(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = async (id) => {
    setActionLoading(id);
    try {
      await markMessageRead(id);
      setMessages(
        messages.map((m) => (m._id === id ? { ...m, isRead: true } : m)),
      );
    } catch (e) {
      alert("فشل تحديث الرسالة");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذه الرسالة نهائياً؟")) return;
    setActionLoading(id);
    try {
      await deleteMessage(id);
      setMessages(messages.filter((m) => m._id !== id));
    } catch (e) {
      alert("فشل حذف الرسالة");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-rose-500 gap-3">
        <AlertCircle className="w-10 h-10" />
        <p className="font-bold">{error}</p>
      </div>
    );
  }

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            صندوق الرسائل والدعم
          </h2>
          <p className="text-slate-500 mt-1">
            لديك{" "}
            <span className="font-bold text-indigo-600">{unreadCount}</span>{" "}
            رسالة غير مقروءة من نموذج تواصل معنا.
          </p>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center text-center gap-4 shadow-sm">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-400">
            <MessageSquare className="w-10 h-10" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg mb-1">
              صندوق الوارد فارغ
            </h3>
            <p className="text-slate-500 text-sm">لم يقم أحد بمراسلتك بعد.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg._id}
              className={`bg-white rounded-2xl border ${!msg.isRead ? "border-indigo-300 shadow-md ring-1 ring-indigo-50" : "border-slate-200 shadow-sm"} overflow-hidden transition-all flex flex-col sm:flex-row relative group`}
            >
              {/* Status Indicator */}
              {!msg.isRead && (
                <div className="absolute top-0 end-0 w-2 h-full bg-indigo-500" />
              )}

              <div className="p-5 flex-1 pe-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800 text-lg">
                    {msg.subject}
                  </h3>
                  <span className="text-xs font-bold text-slate-400" >
                    {new Date(msg.createdAt).toLocaleString("ar-EG-u-nu-latn")}
                  </span>
                </div>

                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {msg.message}
                </p>

                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs">
                      👤
                    </div>
                    {msg.name}
                  </div>
                  <a
                    href={`mailto:${msg.email}`}
                    className="flex items-center gap-1.5 font-bold text-indigo-600 hover:underline"
                  >
                    📧 {msg.email}
                  </a>
                  {msg.phone && (
                    <a
                      href={`tel:${msg.phone}`}
                      className="flex items-center gap-1.5 font-bold text-indigo-600 hover:underline"
                    >
                      📞 {msg.phone}
                    </a>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 sm:w-48 p-4 flex sm:flex-col items-center justify-center sm:justify-start gap-2 border-t sm:border-t-0 sm:border-r border-slate-100">
                {!msg.isRead ? (
                  <button
                    onClick={() => handleMarkRead(msg._id)}
                    disabled={actionLoading === msg._id}
                    className="w-full bg-indigo-100 text-indigo-700 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm hover:bg-indigo-200 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === msg._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    تحديد كمقروءة
                  </button>
                ) : (
                  <div className="w-full text-center py-2 px-3 text-sm font-bold text-slate-400 flex items-center justify-center gap-2">
                    <MailOpen className="w-4 h-4" /> مقروءة
                  </div>
                )}

                <button
                  onClick={() => handleDelete(msg._id)}
                  disabled={actionLoading === msg._id}
                  className="w-full bg-rose-50 text-rose-600 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm hover:bg-rose-100 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" /> حذف الرسالة
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
