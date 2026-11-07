import { useState, useEffect } from "react";
import {
  Send,
  Users,
  User,
  Bell,
  CheckCircle2,
  AlertCircle,
  Search,
  Loader2,
  Mail,
  Clock,
  Sparkles,
  AlertTriangle,
  Flame,
  Calendar,
  Layers,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Trash2,
  Inbox,
  Smartphone,
  Eye,
} from "lucide-react";
import apiClient from "../api/client.js";

export default function PushNotifications() {
  const [activeTab, setActiveTab] = useState("broadcast"); // "broadcast" | "expiring" | "history"

  // Broadcast Form State
  const [target, setTarget] = useState("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [targetPlan, setTargetPlan] = useState("pro");
  const [category, setCategory] = useState("general"); // "general" | "announcement" | "warning" | "subscription" | "offer"
  const [priority, setPriority] = useState("normal"); // "normal" | "high" | "urgent"
  const [link, setLink] = useState("");
  const [actionLabel, setActionLabel] = useState("");
  const [sendPush, setSendPush] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [previewMode, setPreviewMode] = useState("push"); // "push" | "email"

  // Data State
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  // Expiring Subscriptions State
  const [expiringSubs, setExpiringSubs] = useState([]);
  const [expiringStats, setExpiringStats] = useState({ count: 0, expiringToday: 0, expiringWithin7Days: 0 });
  const [loadingExpiring, setLoadingExpiring] = useState(false);
  const [filterDays, setFilterDays] = useState(7);
  const [sendingReminderId, setSendingReminderId] = useState(null);
  const [sendingBulkReminders, setSendingBulkReminders] = useState(false);

  // History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load users when targeting user or plan
  useEffect(() => {
    if (target === "user" || target === "plan") {
      setLoadingUsers(true);
      apiClient
        .get("/admin/notifications/users")
        .then((res) => {
          setUsers(res.data || []);
          setFilteredUsers(res.data || []);
        })
        .catch(() => setUsers([]))
        .finally(() => setLoadingUsers(false));
    }
  }, [target]);

  // Filter users by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            (u.name || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q) ||
            (u.username || "").toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, users]);

  // Load Expiring Subscriptions
  const loadExpiringSubs = async () => {
    try {
      setLoadingExpiring(true);
      const res = await apiClient.get(`/admin/notifications/expiring-subscriptions?days=${filterDays}`);
      if (res.data?.success) {
        setExpiringSubs(res.data.subscriptions || []);
        setExpiringStats({
          count: res.data.count || 0,
          expiringToday: res.data.expiringToday || 0,
          expiringWithin7Days: res.data.expiringWithin7Days || 0,
        });
      }
    } catch (err) {
      // Failed to load
    } finally {
      setLoadingExpiring(false);
    }
  };

  useEffect(() => {
    if (activeTab === "expiring") {
      loadExpiringSubs();
    }
  }, [activeTab, filterDays]);

  // Load History
  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await apiClient.get("/admin/notifications/history");
      if (res.data?.success) {
        setHistory(res.data.history || []);
      }
    } catch (err) {
      // Failed
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  const selectedUser = users.find((u) => u._id === userId);

  // Handle Send Broadcast / Custom Alert
  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (target === "user" && !userId) return;
    if (!sendPush && !sendEmail) {
      setResult({ ok: false, error: "يجب اختيار قناة إرسال واحدة على الأقل (إشعار بالموقع أو بريد إلكتروني)" });
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const payload = {
        target,
        title: title.trim(),
        message: message.trim(),
        category,
        priority,
        link: link.trim(),
        actionLabel: actionLabel.trim(),
        sendPush,
        sendEmail,
      };
      if (target === "user") payload.userId = userId;
      if (target === "plan") payload.plan = targetPlan;

      const res = await apiClient.post("/admin/notifications/push", payload);
      setResult({
        ok: true,
        message: res.data?.message || "تم إرسال الإشعار والتنبيهات بنجاح",
        data: res.data,
      });

      // Reset form
      setTitle("");
      setMessage("");
      setLink("");
      setActionLabel("");
      if (activeTab === "history") loadHistory();
    } catch (err) {
      setResult({
        ok: false,
        error: err.response?.data?.error || err.response?.data?.message || "حدث خطأ أثناء الإرسال",
      });
    } finally {
      setSending(false);
    }
  };

  // Handle Single Expiry Reminder Send
  const handleSendSingleReminder = async (sub) => {
    try {
      setSendingReminderId(sub.subscriptionId);
      const res = await apiClient.post("/admin/notifications/send-expiry-reminder", {
        subscriptionId: sub.subscriptionId,
        sendEmail: true,
        sendPush: true,
      });
      alert(res.data?.message || "تم إرسال تذكير التجديد بنجاح عبر الإيميل والإشعار الفوري!");
      loadExpiringSubs();
    } catch (err) {
      alert(err.response?.data?.error || "فشل إرسال التذكير");
    } finally {
      setSendingReminderId(null);
    }
  };

  // Handle Bulk Expiry Reminders Send
  const handleSendBulkReminders = async () => {
    if (expiringSubs.length === 0) return;
    const confirmSend = window.confirm(
      `هل أنت متأكد من رغبتك في إرسال تذكير تجديد فوري لجميع المشتركين المنتهية باقاتهم (${expiringSubs.length} مشترك) عبر البريد الإلكتروني والإشعار الداخلي؟`
    );
    if (!confirmSend) return;

    try {
      setSendingBulkReminders(true);
      const res = await apiClient.post("/admin/notifications/send-expiry-reminder", {
        bulk: true,
        maxDays: filterDays,
        sendEmail: true,
        sendPush: true,
      });
      alert(res.data?.message || `تم إرسال التذكيرات بنجاح لـ ${res.data?.recipientsCount || expiringSubs.length} مشترك!`);
      loadExpiringSubs();
    } catch (err) {
      alert(err.response?.data?.error || "فشل إرسال التذكيرات الجماعية");
    } finally {
      setSendingBulkReminders(false);
    }
  };

  // Delete History Item
  const handleDeleteHistory = async (id) => {
    try {
      await apiClient.delete(`/admin/notifications/history/${id}`);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      // Failed
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">مركز الإشعارات والتنبيهات المتقدم</h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                بريد إلكتروني + Push
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              إرسال تنبيهات جماعية وفردية، تذكيرات انتهاء الاشتراكات، وإشعارات الموقع والبريد بنقرة واحدة
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("broadcast")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "broadcast"
                ? "bg-white text-indigo-700 shadow-sm shadow-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>إرسال تنبيه</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("expiring")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "expiring"
                ? "bg-white text-indigo-700 shadow-sm shadow-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>تنبيهات انتهاء الباقات</span>
            {expiringStats.count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {expiringStats.count}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-white text-indigo-700 shadow-sm shadow-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>سجل الإرسال</span>
          </button>
        </div>
      </div>

      {/* ────────────────── TAB 1: BROADCAST & CUSTOM ALERTS ────────────────── */}
      {activeTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Compose Form (Col 7) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  إنشاء تنبيه مخصص
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">خصص نص التنبيه والجمهور وقنوات التسليم</p>
              </div>
            </div>

            <form onSubmit={handleSend} className="space-y-4">
              {/* Target Audience */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">الجمهور المستهدف (Audience)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTarget("all");
                      setUserId("");
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 text-xs font-bold transition-all gap-1.5 ${
                      target === "all"
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-800 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 bg-slate-50/50"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    الكل (Broadcast)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTarget("plan")}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 text-xs font-bold transition-all gap-1.5 ${
                      target === "plan"
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-800 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 bg-slate-50/50"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    حسب الباقة
                  </button>

                  <button
                    type="button"
                    onClick={() => setTarget("user")}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 text-xs font-bold transition-all gap-1.5 ${
                      target === "user"
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-800 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 bg-slate-50/50"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    مستخدم محدد
                  </button>

                  <button
                    type="button"
                    onClick={() => setTarget("expiring")}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 text-xs font-bold transition-all gap-1.5 ${
                      target === "expiring"
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-800 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 bg-slate-50/50"
                    }`}
                  >
                    <Clock className="w-4 h-4 text-amber-600" />
                    باقات توشك تنتهي
                  </button>
                </div>
              </div>

              {/* User Selection if target is user */}
              {target === "user" && (
                <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-2.5">
                  <label className="text-xs font-bold text-slate-700 block">ابحث واختر المستخدم:</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute end-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="ابحث بالاسم، البريد الإلكتروني، أو الهاتف..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl pe-9 ps-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  {userId && selectedUser && (
                    <div className="flex items-center justify-between bg-white border border-indigo-200 rounded-xl p-2.5 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                          {(selectedUser.name || "?")[0]}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{selectedUser.name}</p>
                          <p className="text-[11px] text-slate-500">{selectedUser.email}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUserId("")}
                        className="text-xs text-rose-500 font-bold hover:underline"
                      >
                        تغيير
                      </button>
                    </div>
                  )}

                  {!userId && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto bg-white divide-y divide-slate-50">
                      {loadingUsers ? (
                        <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                          جاري تحميل المستخدمين...
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <p className="text-center text-slate-400 text-xs py-4">لا يوجد مستخدمون مطابقون</p>
                      ) : (
                        filteredUsers.slice(0, 50).map((u) => (
                          <button
                            key={u._id}
                            type="button"
                            onClick={() => setUserId(u._id)}
                            className="w-full flex items-center justify-between px-3 py-2 text-start text-xs hover:bg-slate-50 transition-colors"
                          >
                            <span className="font-semibold text-slate-800">{u.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Plan Selection if target is plan */}
              {target === "plan" && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setTargetPlan("free")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      targetPlan === "free"
                        ? "bg-white border-indigo-600 text-indigo-700 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    مشتركو الباقة المجانية (Free)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetPlan("pro")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      targetPlan === "pro"
                        ? "bg-white border-indigo-600 text-indigo-700 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    مشتركو باقة برو (Pro)
                  </button>
                </div>
              )}

              {/* Delivery Channels */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 block">قنوات الإرسال:</span>
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={sendPush}
                      onChange={(e) => setSendPush(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                    إشعار داخل الموقع (Push)
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    بريد إلكتروني (HTML Email)
                  </label>
                </div>
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">تصنيف الإشعار</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                  >
                    <option value="general">عام / تحديثات عامة</option>
                    <option value="announcement">إعلان وتنبيه رسمي</option>
                    <option value="subscription">تجديد واشتراكات</option>
                    <option value="warning">تحذير أو تنبيه عاجل</option>
                    <option value="offer">عرض خاص وترقية</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">درجة الأهمية</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                  >
                    <option value="normal">عادي (Normal)</option>
                    <option value="high">مرتفع (High)</option>
                    <option value="urgent">عاجل وفوري (Urgent)</option>
                  </select>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">عنوان التنبيه *</label>
                  <span className="text-[10px] text-slate-400 font-mono">{title.length}/100</span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: خصم 30% على تجديد الباقة السنوية لليوم فقط!"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Message Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">نص الرسالة والتفاصيل *</label>
                  <span className="text-[10px] text-slate-400 font-mono">{message.length}/500</span>
                </div>
                <textarea
                  rows={4}
                  required
                  maxLength={500}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب تفاصيل التنبيه أو الإعلان الذي سيظهر للمستخدم في الموقع والبريد الإلكتروني..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                />
              </div>

              {/* Quick Action Link & Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">رابط الإجراء (Link)</label>
                    <div className="flex gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setLink("/subscriptions")}
                        className="text-indigo-600 hover:underline"
                      >
                        الاشتراكات
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setLink("/products")}
                        className="text-indigo-600 hover:underline"
                      >
                        المتجر
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="/subscriptions أو رابط خارجي"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-slate-600"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">نص الزر (Action Label)</label>
                  <input
                    type="text"
                    value={actionLabel}
                    onChange={(e) => setActionLabel(e.target.value)}
                    placeholder="مثال: تجديد الباقة الآن"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Feedback Alert */}
              {result && (
                <div
                  className={`flex items-start gap-2.5 rounded-2xl p-4 text-xs font-medium border ${
                    result.ok
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  {result.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold">{result.ok ? result.message : result.error}</p>
                    {result.ok && result.data && (
                      <p className="text-[11px] text-emerald-600 mt-0.5">
                        تم تسليم: {result.data.notifsCreated || 0} إشعار موقع • {result.data.emailsSent || 0} بريد إلكتروني
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sending || !title.trim() || !message.trim() || (target === "user" && !userId)}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.99]"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري إرسال التنبيه والرسائل...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>إرسال التنبيه الآن</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Live Previews (Col 5) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  معاينة حية للإشعار
                </h3>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("push")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      previewMode === "push" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    شاشة الموقع
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("email")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      previewMode === "email" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    البريد (Email)
                  </button>
                </div>
              </div>

              {previewMode === "push" ? (
                /* IN-APP TOAST PREVIEW */
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-400">
                    كيف يظهر الإشعار للمستخدم في جرس الإشعارات ونافذة التنبيه الفورية:
                  </p>
                  <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl space-y-3 border border-slate-800">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        {category === "warning" ? (
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                        ) : category === "subscription" ? (
                          <Clock className="w-4 h-4 text-amber-400" />
                        ) : category === "offer" ? (
                          <Flame className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Bell className="w-4 h-4 text-indigo-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-black truncate">{title || "عنوان التنبيه الجديد..."}</p>
                          <span className="text-[10px] text-slate-400">الآن</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 line-clamp-3 leading-relaxed">
                          {message || "هنا تظهر تفاصيل التنبيه المكتوبة بدقة وتوجيهات الاستخدام..."}
                        </p>

                        {actionLabel && (
                          <button
                            type="button"
                            className="mt-2.5 px-3 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-700 transition-all flex items-center gap-1"
                          >
                            <span>{actionLabel}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* EMAIL PREVIEW */
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-400">
                    معاينة قالب البريد الإلكتروني الذي يصل إلى صندوق الوارد (Inbox):
                  </p>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 text-slate-900 shadow-sm text-xs">
                    <div className="bg-slate-900 text-white p-3.5 text-center">
                      <h4 className="font-black text-sm">THENITH</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">إشعار وتنبيه رسمي</p>
                    </div>
                    <div className="p-4 bg-white space-y-2.5">
                      <p className="text-xs font-bold text-slate-800">مرحباً عميلنا العزيز،</p>
                      <div className="p-2.5 rounded-lg bg-indigo-50 border-r-4 border-indigo-600 font-bold text-indigo-900 text-xs">
                        {title || "عنوان التنبيه..."}
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed whitespace-pre-wrap">
                        {message || "نص الرسالة البريدية الاحترافية المصممة..."}
                      </p>
                      {actionLabel && (
                        <div className="text-center pt-2">
                          <span className="inline-block px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm">
                            {actionLabel} ←
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Summary Pill */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>الجمهور المستهدف:</span>
                  <span className="font-bold text-slate-800">
                    {target === "all"
                      ? "جميع المستخدمين"
                      : target === "plan"
                      ? `باقة ${targetPlan}`
                      : target === "expiring"
                      ? "الباقات التي تقترب من الانتهاء"
                      : selectedUser?.name || "مستخدم محدد"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>القنوات المفعلة:</span>
                  <span className="font-bold text-slate-800">
                    {[sendPush ? "داخل المنصة" : null, sendEmail ? "البريد الإلكتروني" : null]
                      .filter(Boolean)
                      .join(" + ")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── TAB 2: EXPIRING SUBSCRIPTIONS ────────────────── */}
      {activeTab === "expiring" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500">تنتهي خلال {filterDays} أيام</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{expiringStats.count}</p>
                <span className="text-[11px] text-indigo-600 font-bold mt-1 inline-block">تحتاج لتذكير تجديد</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500">تنتهي اليوم فوراً</span>
                <p className="text-2xl font-black text-rose-600 mt-1">{expiringStats.expiringToday}</p>
                <span className="text-[11px] text-rose-500 font-bold mt-1 inline-block">أولوية عاجلة جداً</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500">إجراء جماعي سريع</span>
                <p className="text-xs text-slate-600 mt-1">تذكير جميع المشتركين المنتهية باقاتهم</p>
                <button
                  type="button"
                  onClick={handleSendBulkReminders}
                  disabled={sendingBulkReminders || expiringSubs.length === 0}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {sendingBulkReminders ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  <span>إرسال تذكير للكل (Email+Push)</span>
                </button>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Send className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Milestone Schedule Banner */}
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-amber-50 rounded-3xl border border-indigo-100 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/30">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm">جدول التذكيرات الآلي المحدد (3 مراحل تنبيه فقط):</p>
                <p className="text-slate-500 mt-0.5">
                  يرسل النظام تلقائياً 3 إيميلات محددة: أول إيميل عند بقاء 7 أيام، إيميل ثانٍ عند 3 أيام، وإيميل أخير عند يوم واحد فقط.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto font-bold text-[11px]">
              <span className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 shadow-2xs">
                1️⃣ 7 أيام متبقية
              </span>
              <span className="text-slate-400">←</span>
              <span className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-700 shadow-2xs">
                2️⃣ 3 أيام متبقية
              </span>
              <span className="text-slate-400">←</span>
              <span className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 shadow-2xs">
                3️⃣ يوم واحد فقط
              </span>
            </div>
          </div>

          {/* Subscriptions List Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  المشتركون أصحاب الباقات التي توشك على الانتهاء
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  أرسل بريداً إلكترونياً رسمياً وإشعاراً فورياً للعميل لتجديد اشتراكه قبل توقف ميزات كروته الذكية
                </p>
              </div>

              {/* Day filter selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold">الفترة:</span>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                  {[3, 7, 14, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFilterDays(d)}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        filterDays === d ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {d} أيام
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={loadExpiringSubs}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                  title="تحديث القائمة"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingExpiring ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Expiring Subscriptions Table */}
            {loadingExpiring ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                <span className="text-xs font-bold">جاري فحص الاشتراكات وقوائم التجديد...</span>
              </div>
            ) : expiringSubs.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">لا توجد اشتراكات تنتهي خلال {filterDays} أيام!</h4>
                <p className="text-xs text-slate-400">جميع اشتراكات العملاء سارية ونشطة حالياً بدون انتهاء وشيك.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-600 font-bold">
                      <th className="py-3 px-4 text-start rounded-r-2xl">المستخدم</th>
                      <th className="py-3 px-4 text-start">الباقة</th>
                      <th className="py-3 px-4 text-start">تاريخ الانتهاء</th>
                      <th className="py-3 px-4 text-start">المدة المتبقية</th>
                      <th className="py-3 px-4 text-start">التذكيرات المرسلة</th>
                      <th className="py-3 px-4 text-center rounded-l-2xl">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expiringSubs.map((sub) => {
                      const isSingleSending = sendingReminderId === sub.subscriptionId;
                      return (
                        <tr key={sub.subscriptionId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                {(sub.user?.name || "?")[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate">{sub.user?.name || "بدون اسم"}</p>
                                <p className="text-[11px] text-slate-400 font-mono truncate">{sub.user?.email}</p>
                                {sub.user?.phone && (
                                  <p className="text-[10px] text-slate-400 font-mono">{sub.user.phone}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold">
                              باقة {sub.planName}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            {new Date(sub.expiresAt).toLocaleDateString("ar-EG-u-nu-latn", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>

                          <td className="py-3.5 px-4">
                            {sub.daysLeft <= 0 ? (
                              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-black text-[11px]">
                                ينتهي اليوم!
                              </span>
                            ) : sub.daysLeft <= 3 ? (
                              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-black text-[11px]">
                                متبقي {sub.daysLeft} أيام
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                                متبقي {sub.daysLeft} يوم
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {(() => {
                              const sent = sub.expiryRemindersSent || [];
                              return (
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      sent.includes(7)
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        : "bg-slate-100 text-slate-400"
                                    }`}
                                    title={sent.includes(7) ? "تم إرسال تذكير الـ 7 أيام بنجاح" : "تذكير الـ 7 أيام لم يُرسل بعد"}
                                  >
                                    7د {sent.includes(7) ? "✓" : "○"}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      sent.includes(3)
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        : "bg-slate-100 text-slate-400"
                                    }`}
                                    title={sent.includes(3) ? "تم إرسال تذكير الـ 3 أيام بنجاح" : "تذكير الـ 3 أيام لم يُرسل بعد"}
                                  >
                                    3د {sent.includes(3) ? "✓" : "○"}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      sent.includes(1)
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        : "bg-slate-100 text-slate-400"
                                    }`}
                                    title={sent.includes(1) ? "تم إرسال تذكير اليوم الواحد بنجاح" : "تذكير اليوم الواحد لم يُرسل بعد"}
                                  >
                                    1د {sent.includes(1) ? "✓" : "○"}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleSendSingleReminder(sub)}
                              disabled={isSingleSending}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs transition-all inline-flex items-center gap-1.5 shadow-xs"
                            >
                              {isSingleSending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Mail className="w-3.5 h-3.5" />
                              )}
                              <span>إرسال تذكير تجديد (Email+Push)</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────── TAB 3: SENT NOTIFICATION HISTORY ────────────────── */}
      {activeTab === "history" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Inbox className="w-4 h-4 text-indigo-600" />
                سجل الإشعارات والتنبيهات المرسلة
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تتبع كافة التنبيهات وحملات البريد وتذكيرات التجديد التي تم إرسالها سابقاً
              </p>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              title="تحديث السجل"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loadingHistory ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
              <span className="text-xs font-bold">جاري تحميل سجل الإرسال...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 mx-auto flex items-center justify-center">
                <Inbox className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">لا يوجد سجل إشعارات بعد</h4>
              <p className="text-xs text-slate-400">أي إشعار أو تنبيه أو تذكير ترسله سيتم توثيقه هنا تلقائياً.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map((item) => (
                <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      {item.type === "expiry_reminder" ? (
                        <Clock className="w-4.5 h-4.5 text-amber-500" />
                      ) : (
                        <Bell className="w-4.5 h-4.5" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{item.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {item.targetName}
                        </span>
                        {item.channels?.map((ch) => (
                          <span
                            key={ch}
                            className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                              ch === "email" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {ch === "email" ? "إيميل" : "إشعار"}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{item.message}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.sentAt).toLocaleString("ar-EG-u-nu-latn")} • المستلمون: {item.recipientsCount || 1}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteHistory(item.id)}
                    className="self-end sm:self-center p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="حذف من السجل"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
