import { useState, useEffect, useCallback } from "react";
import {
  fetchSubscriptionStats,
  fetchFilteredUsers,
  fetchSubscriptionEvents,
  cancelUserSubscriptionByAdmin,
} from "../services/adminApi.js";
import {
  Loader2,
  TrendingUp,
  Users,
  CreditCard,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  X,
  Mail,
  Phone,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  UserX,
  ShieldAlert,
  FileText,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] ${wide ? "max-w-4xl" : "max-w-lg"}`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function SubscriptionAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("monthly"); // daily, monthly, yearly
  const [filterType, setFilterType] = useState(null); // 'total', 'free', 'pro', 'lost', 'abandoned'
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Subscription & Cancellation Events State
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsFilter, setEventsFilter] = useState("all");
  const [eventsSearch, setEventsSearch] = useState("");
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPagination, setEventsPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [eventsCounts, setEventsCounts] = useState({
    all: 0,
    full_account_history: 0,
    cancelled_by_user: 0,
    cancelled_by_admin: 0,
    paid_online: 0,
    activated_by_admin: 0,
  });
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Admin Cancel Subscription Modal State
  const [cancelModalUser, setCancelModalUser] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState("");

  const filterByAccount = (user) => {
    if (!user) return;
    const term = user.email || user.phone || user.name || "";
    setEventsSearch(term);
    setEventsFilter("full_account_history");
    setEventsPage(1);
    loadEvents(1, "full_account_history", term);
    document.getElementById("subscription-events-log")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAdminCancelSubscription = async () => {
    if (!cancelModalUser) return;
    setCancelling(true);
    setCancelSuccessMsg("");
    try {
      const userId = cancelModalUser._id || cancelModalUser.id;
      const res = await cancelUserSubscriptionByAdmin(
        userId,
        cancelReason || "إلغاء الاشتراك من قبل الأدمن"
      );
      setCancelSuccessMsg(res?.message || "تم إلغاء الاشتراك بنجاح بواسطة الأدمن وتوثيق الحدث");
      setTimeout(() => {
        setCancelModalUser(null);
        setCancelReason("");
        setCancelSuccessMsg("");
      }, 1300);
      loadEvents(eventsPage, eventsFilter, eventsSearch);
      fetchSubscriptionStats().then(setStats).catch(() => {});
    } catch (err) {
      alert("فشل إلغاء الاشتراك: " + (err.message || err));
    } finally {
      setCancelling(false);
    }
  };

  const loadEvents = useCallback(async (page = 1, type = eventsFilter, search = eventsSearch) => {
    setEventsLoading(true);
    try {
      const res = await fetchSubscriptionEvents({
        page,
        limit: 15,
        type,
        search,
      });
      if (res) {
        setEvents(res.events || []);
        if (res.pagination) setEventsPagination(res.pagination);
        if (res.counts) setEventsCounts(res.counts);
      }
    } catch (err) {
      console.error("Failed to load subscription events:", err);
    } finally {
      setEventsLoading(false);
    }
  }, [eventsFilter, eventsSearch]);

  useEffect(() => {
    loadEvents(eventsPage, eventsFilter, eventsSearch);
  }, [eventsPage, eventsFilter, loadEvents]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setEventsPage(1);
    loadEvents(1, eventsFilter, eventsSearch);
  };

  const openFilteredModal = async (type) => {
    setFilterType(type);
    setLoadingUsers(true);
    try {
      const data = await fetchFilteredUsers(type);
      setFilteredUsers(data);
    } catch (e) {
      alert("Error fetching users: " + e.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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

  const {
    statusCounts,
    planCounts,
    totalUsers,
    freeUsersCount,
    proUsersCount,
    lostSubscriptionsCount,
    abandonedUsersCount,
    pendingUsersCount,
    metrics,
    trend,
    recentPayments,
  } = stats;

  const activeCount = statusCounts.active || 0;
  const currentMetric = metrics[timeRange];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            إحصائيات الاشتراكات الدقيقة
          </h2>
          <p className="text-slate-500 mt-1">
            متابعة شاملة ويومية لنمو الإيرادات وحالات العملاء.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="#subscription-events-log"
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-2"
          >
            <UserX className="w-4 h-4 text-rose-600" />
            <span>سجل الاشتراكات والإلغاءات</span>
            {eventsCounts.cancelled_by_user > 0 && (
              <span
                className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-mono font-black"
                title="إلغاء الاشتراك من قبل العميل"
              >
                العميل: {eventsCounts.cancelled_by_user}
              </span>
            )}
            {eventsCounts.cancelled_by_admin > 0 && (
              <span
                className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-mono font-black"
                title="إلغاء الاشتراك من قبل الأدمن"
              >
                الأدمن: {eventsCounts.cancelled_by_admin}
              </span>
            )}
          </a>

          <div className="flex items-center bg-slate-200/50 p-1.5 rounded-2xl w-max">
          <button
            onClick={() => setTimeRange("daily")}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${timeRange === "daily" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"}`}
          >
            اليوم
          </button>
          <button
            onClick={() => setTimeRange("monthly")}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${timeRange === "monthly" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"}`}
          >
            الشهر
          </button>
          <button
            onClick={() => setTimeRange("yearly")}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${timeRange === "yearly" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"}`}
          >
            السنة
          </button>
        </div>
      </div>
    </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {/* Dynamic Revenue Based on Range */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 end-0 w-24 h-24 bg-indigo-50 rounded-es-full -z-10 opacity-50" />
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-slate-500">
              {timeRange === "daily"
                ? "إيرادات اليوم"
                : timeRange === "monthly"
                  ? "إيرادات الشهر"
                  : "إيرادات السنة"}
            </p>
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-800">
            {currentMetric.revenue.toLocaleString("en-US")}{" "}
            <span className="text-sm font-normal text-slate-400">ج.م</span>
          </p>
          {timeRange === "monthly" && (
            <div
              className={`mt-2 flex items-center gap-1 text-xs font-bold ${currentMetric.growth >= 0 ? "text-emerald-500" : "text-rose-500"}`}
            >
              <TrendingUp
                className={`w-3 h-3 ${currentMetric.growth < 0 ? "rotate-180" : ""}`}
              />
              <span>
                {Math.abs(currentMetric.growth).toFixed(1)}% عن الشهر الماضي
              </span>
            </div>
          )}
          {timeRange !== "monthly" && (
            <p className="mt-2 text-xs font-bold text-slate-400">
              {currentMetric.count} عملية دفع ناجحة
            </p>
          )}
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-slate-500">
              إجمالي الإيرادات (All Time)
            </p>
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-800">
            {metrics.total.toLocaleString("en-US")}{" "}
            <span className="text-sm font-normal text-slate-400">ج.م</span>
          </p>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            تراكمي لجميع الباقات
          </p>
        </div>

        {/* Total Active / Total Users */}
        <div
          onClick={() => openFilteredModal("total")}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-slate-500 group-hover:text-emerald-600 transition-colors">
              إجمالي المستخدمين
            </p>
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-800">
            {totalUsers.toLocaleString("en-US")}
          </p>
          <p className="text-xs text-emerald-500 mt-2 font-bold flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> عرض بياناتهم
          </p>
        </div>

        {/* Free Plan */}
        <div
          onClick={() => openFilteredModal("free")}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-slate-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-slate-500 group-hover:text-slate-800 transition-colors">
              الباقة المجانية
            </p>
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-200 transition-colors">
              <Users className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-800">
            {freeUsersCount.toLocaleString("en-US")}
          </p>
          <p className="text-xs text-slate-500 mt-2 font-bold flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> عرض الباقة المجانية
          </p>
        </div>

        {/* Pro Plan */}
        <div
          onClick={() => openFilteredModal("pro")}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">
              باقة برو
            </p>
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <Activity className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-800">
            {proUsersCount.toLocaleString("en-US")}
          </p>
          <p className="text-xs text-indigo-500 mt-2 font-bold flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> عرض باقة برو
          </p>
        </div>

        {/* Cancelled/Expired (Clickable) */}
        <div
          onClick={() => openFilteredModal("lost")}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-rose-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-slate-500 group-hover:text-rose-600 transition-colors">
              الاشتراكات المفقودة
            </p>
            <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center group-hover:bg-rose-100 transition-colors">
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-800">
              {lostSubscriptionsCount.toLocaleString("en-US")}
            </p>
          </div>
          <p className="text-xs text-rose-500 mt-2 font-bold flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> عرض المفقودين
          </p>
        </div>

        {/* Abandoned Checkouts */}
        <div
          onClick={() => openFilteredModal("abandoned")}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-amber-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-slate-500 group-hover:text-amber-600 transition-colors">
              المنسحبين من الدفع
            </p>
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-800">
              {(abandonedUsersCount || 0).toLocaleString("en-US")}
            </p>
          </div>
          <p className="text-xs text-amber-500 mt-2 font-bold flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> استهداف إعادة التسويق
          </p>
        </div>

        {/* Pending Payments */}
        <div
          onClick={() => openFilteredModal("pending")}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-slate-500 group-hover:text-blue-600 transition-colors">
              المدفوعات المعلقة
            </p>
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-800">
              {(pendingUsersCount || 0).toLocaleString("en-US")}
            </p>
          </div>
          <p className="text-xs text-blue-500 mt-2 font-bold flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> عرض بياناتهم
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Charts / Breakdowns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Trend Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-slate-800">
                نمو الإيرادات (آخر 6 أشهر)
              </h3>
            </div>
            {trend.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">
                لا توجد بيانات كافية للرسم البياني
              </p>
            ) : (
              <div className="h-64 w-full mt-4" >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trend}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#6366f1"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#6366f1"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickFormatter={(val) => `${val}`}
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow:
                          "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value) => [`${value} ج.م`, "الإيرادات"]}
                      labelStyle={{
                        fontWeight: "bold",
                        color: "#1e293b",
                        marginBottom: "4px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Recent Payments Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">
                أحدث عمليات الدفع الناجحة
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-end">
                <thead>
                  <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100 bg-slate-50/50">
                    <th className="py-3 px-5">المستخدم</th>
                    <th className="py-3 px-5">الباقة</th>
                    <th className="py-3 px-5">المبلغ</th>
                    <th className="py-3 px-5">التاريخ</th>
                    <th className="py-3 px-5">بواسطة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPayments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-400 text-sm"
                      >
                        لا توجد مدفوعات حديثة
                      </td>
                    </tr>
                  ) : (
                    recentPayments.map((p) => (
                      <tr
                        key={p._id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-3 px-5">
                          <p className="font-bold text-slate-800 text-sm">
                            {p.userId?.name || "مستخدم محذوف"}
                          </p>
                          <p className="text-xs text-slate-500" >
                            {p.userId?.email || ""}
                          </p>
                        </td>
                        <td className="py-3 px-5">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold uppercase">
                            {p.referenceId?.planId?.name?.ar || p.referenceId?.planId?.name?.en || p.referenceId?.planId?.key || "—"}
                          </span>
                        </td>
                        <td className="py-3 px-5 font-black text-slate-800 text-sm">
                          {p.amount} ج.م
                        </td>
                        <td className="py-3 px-5 text-sm text-slate-500">
                          {new Date(p.paidAt).toLocaleDateString("ar-EG-u-nu-latn")}
                        </td>
                        <td className="py-3 px-5 text-xs font-medium text-slate-400 capitalize">
                          {p.provider}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Breakdown */}
        <div className="space-y-6">
          {/* Plan Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-5">
              توزيع الباقات النشطة
            </h3>
            {planCounts.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">
                لا توجد باقات نشطة
              </p>
            ) : (
              <div className="space-y-4">
                {planCounts.map((p, i) => {
                  const percentage =
                    activeCount > 0
                      ? ((p.count / activeCount) * 100).toFixed(0)
                      : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-bold text-slate-700">
                          {typeof p.name === 'object' ? (p.name?.ar || p.name?.en) : p.name}
                        </span>
                        <span className="font-bold text-slate-500">
                          {percentage}% ({p.count})
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-5">
              حالة جميع الاشتراكات
            </h3>
            <div className="space-y-3">
              {[
                {
                  key: "active",
                  label: "نشط",
                  icon: CheckCircle2,
                  color: "text-emerald-500",
                  bg: "bg-emerald-50",
                },
                {
                  key: "trialing",
                  label: "فترة تجريبية",
                  icon: Clock,
                  color: "text-amber-500",
                  bg: "bg-amber-50",
                },
                {
                  key: "pending",
                  label: "معلق",
                  icon: Loader2,
                  color: "text-blue-500",
                  bg: "bg-blue-50",
                },
                {
                  key: "expired",
                  label: "منتهي",
                  icon: XCircle,
                  color: "text-rose-500",
                  bg: "bg-rose-50",
                },
                {
                  key: "cancelled",
                  label: "ملغى",
                  icon: XCircle,
                  color: "text-slate-500",
                  bg: "bg-slate-50",
                },
              ].map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.bg}`}
                    >
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <span className="font-bold text-slate-700 text-sm">
                      {s.label}
                    </span>
                  </div>
                  <span className="font-black text-slate-800">
                    {statusCounts[s.key] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Subscription & Cancellation Events Log ─── */}
      <div id="subscription-events-log" className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Activity className="w-4.5 h-4.5" />
              </span>
              سجل أحداث الاشتراكات وإلغاءات العملاء
            </h3>
            <p className="text-xs text-slate-500">
              سجل تفصيلي ولحظي يوثق كل اشتراك جديد، تجديد، أو عملية إلغاء اشتراك تمت بواسطة العميل مع الأسباب وتفاصيل العملية.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative min-w-[240px] sm:w-64">
              <input
                type="text"
                value={eventsSearch}
                onChange={(e) => setEventsSearch(e.target.value)}
                placeholder="بحث بالاسم، الإيميل، الهاتف..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 pe-9 text-xs outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button
                type="submit"
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-0.5 cursor-pointer"
                title="بحث"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadEvents(eventsPage, eventsFilter, eventsSearch)}
              disabled={eventsLoading}
              className="p-2 bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              title="تحديث السجل"
            >
              <RefreshCw className={`w-4 h-4 ${eventsLoading ? "animate-spin text-indigo-600" : ""}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>
          </div>
        </div>

        {/* Filter Badges Bar */}
        <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <span className="text-xs font-bold text-slate-500 shrink-0 flex items-center gap-1 ms-1">
            <Filter className="w-3.5 h-3.5" />
            التصنيف:
          </span>

          {[
            { id: "all", label: "الكل (العمليات المكتملة)", count: eventsCounts.all, color: "slate" },
            { id: "full_account_history", label: "سجل اشتراكات الحساب بالكامل", count: eventsCounts.full_account_history, color: "purple", highlight: true },
            { id: "cancelled_by_user", label: "إلغاء الاشتراك من قبل العميل", count: eventsCounts.cancelled_by_user, color: "rose", highlight: true },
            { id: "cancelled_by_admin", label: "إلغاء الاشتراك من قبل الأدمن", count: eventsCounts.cancelled_by_admin, color: "amber", highlight: true },
            { id: "paid_online", label: "عملية دفع مكتملة (أونلاين)", count: eventsCounts.paid_online, color: "emerald" },
            { id: "activated_by_admin", label: "تفعيل الباقة من الأدمن", count: eventsCounts.activated_by_admin, color: "indigo" },
          ].map((tab) => {
            const isActive = eventsFilter === tab.id;
            const isFullHistory = tab.id === "full_account_history";
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setEventsFilter(tab.id);
                  setEventsPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? isFullHistory
                      ? "bg-purple-600 text-white shadow-sm ring-2 ring-purple-300"
                      : tab.highlight
                      ? tab.id === "cancelled_by_user"
                        ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-300"
                        : "bg-amber-600 text-white shadow-sm ring-2 ring-amber-300"
                      : "bg-indigo-600 text-white shadow-sm"
                    : isFullHistory
                    ? "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                    : tab.highlight
                    ? tab.id === "cancelled_by_user"
                      ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-700"
                }`}>
                  {tab.count || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Events Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-end">
            <thead>
              <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 px-5">العميل والحساب</th>
                <th className="py-3 px-5">نوع الحركة</th>
                <th className="py-3 px-5">جهة الإجراء</th>
                <th className="py-3 px-5">الباقة والفوترة</th>
                <th className="py-3 px-5">المبلغ / الوسيلة</th>
                <th className="py-3 px-5">السبب / الملاحظات</th>
                <th className="py-3 px-5">التاريخ والوقت</th>
                <th className="py-3 px-5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {eventsLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-bold">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
                    <span>جاري تحميل سجل الأحداث...</span>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-medium">
                    <Info className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600">لا توجد حركات مطابقة لهذا التصنيف حالياً</p>
                    <p className="text-xs text-slate-400 mt-1">سيتم رصد وعرض أي حركة اشتراك (للعميل أو الأدمن) لحظياً هنا</p>
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const isCancel = ev.type === "cancelled_by_user";
                  return (
                    <tr
                      key={ev.id}
                      className={`transition-colors ${
                        isCancel ? "hover:bg-rose-50/40 bg-rose-50/15" : "hover:bg-slate-50/50"
                      }`}
                    >
                      {/* Customer */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                              {ev.user?.avatar ? (
                                <img src={ev.user.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-4.5 h-4.5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 leading-tight">
                                {ev.user?.name || "بدون اسم"}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5" dir="ltr">
                                {ev.user?.phone || ev.user?.email || "—"}
                              </p>
                            </div>
                          </div>
                          {ev.user && (
                            <button
                              type="button"
                              onClick={() => filterByAccount(ev.user)}
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="تصفية وعرض سجل هذا الحساب بالكامل"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Event Type Badge */}
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${
                          ev.type === "cancelled_by_user"
                            ? "bg-rose-100/90 text-rose-800 border-rose-300 shadow-2xs"
                            : ev.type === "cancelled_by_admin"
                            ? "bg-amber-100/90 text-amber-800 border-amber-300 shadow-2xs"
                            : ev.type === "paid_online" || ev.type === "activated" || ev.type === "renewed"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : ev.type === "activated_by_admin"
                            ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                            : "bg-purple-100 text-purple-800 border-purple-300"
                        }`}>
                          {ev.type === "cancelled_by_user" && <UserX className="w-3.5 h-3.5 text-rose-600" />}
                          {ev.type === "cancelled_by_admin" && <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />}
                          {(ev.type === "paid_online" || ev.type === "activated" || ev.type === "renewed") && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          {ev.type === "activated_by_admin" && <Activity className="w-3.5 h-3.5 text-indigo-600" />}
                          {ev.type === "full_account_history" && <Clock className="w-3.5 h-3.5 text-purple-600" />}
                          <span>{ev.titleAr}</span>
                        </span>
                      </td>

                      {/* Actor Badge (بواسطة العميل أو الأدمن) */}
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                          ev.actorType === "user"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : ev.actorType === "admin"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            ev.actorType === "user"
                              ? "bg-sky-500"
                              : ev.actorType === "admin"
                              ? "bg-purple-600"
                              : "bg-slate-400"
                          }`} />
                          <span>
                            {ev.actor || (ev.actorType === "user" ? "العميل" : ev.actorType === "admin" ? "الأدمن" : "النظام")}
                          </span>
                        </span>
                      </td>

                      {/* Plan & Billing Period */}
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-800 text-xs">
                            {ev.planName || "باقة برو"}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            الدورة: {ev.billingPeriod || "شهري"}
                          </span>
                        </div>
                      </td>

                      {/* Amount & Method */}
                      <td className="py-3.5 px-5">
                        {ev.amount ? (
                          <div>
                            <span className="font-black text-slate-800 text-xs">{ev.amount} ج.م</span>
                            {ev.paymentMethod && (
                              <p className="text-[11px] text-slate-500 truncate max-w-[130px]">{ev.paymentMethod}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-5 max-w-[220px]">
                        <p className="text-xs text-slate-700 truncate font-medium" title={ev.reason}>
                          {ev.reason || "—"}
                        </p>
                        {ev.ip && ev.ip !== "—" && (
                          <span className="text-[10px] font-mono text-slate-400" dir="ltr">IP: {ev.ip}</span>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col text-xs text-slate-600" dir="ltr">
                          <span className="font-medium">
                            {new Date(ev.createdAt).toLocaleDateString("ar-EG-u-nu-latn", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(ev.createdAt).toLocaleTimeString("ar-EG-u-nu-latn", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedEvent(ev)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>التفاصيل</span>
                          </button>
                          {ev.user && (
                            <button
                              type="button"
                              onClick={() => filterByAccount(ev.user)}
                              className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="عرض سجل حركات هذا الحساب بالكامل"
                            >
                              <Clock className="w-3.5 h-3.5 text-purple-600" />
                              <span className="hidden xl:inline">سجل الحساب</span>
                            </button>
                          )}
                          {ev.user && ev.type !== "cancelled_by_user" && ev.type !== "cancelled_by_admin" && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelModalUser(ev.user);
                                setCancelReason("إلغاء الاشتراك من قبل الأدمن");
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="إلغاء اشتراك العميل بواسطة الإدارة"
                            >
                              <UserX className="w-3.5 h-3.5 text-rose-600" />
                              <span className="hidden xl:inline">إلغاء الاشتراك</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {eventsPagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4 text-xs">
            <span className="font-bold text-slate-500">
              إجمالي الأحداث: {eventsPagination.total} | الصفحة {eventsPagination.page} من {eventsPagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={eventsPagination.page <= 1 || eventsLoading}
                onClick={() => setEventsPage((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                السابق
              </button>
              <button
                type="button"
                disabled={eventsPagination.page >= eventsPagination.totalPages || eventsLoading}
                onClick={() => setEventsPage((prev) => Math.min(eventsPagination.totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                التالي
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filtered Users Modal */}
      {filterType && (
        <Modal
          title={
            filterType === "total"
              ? "إجمالي المستخدمين"
              : filterType === "free"
                ? "مستخدمي الباقة المجانية"
                : filterType === "pro"
                  ? "مستخدمي باقة برو"
                  : filterType === "lost"
                    ? "الاشتراكات المفقودة (ملغى/منتهي)"
                    : filterType === "abandoned"
                      ? "العملاء المنسحبين من الدفع"
                      : "المدفوعات المعلقة"
          }
          onClose={() => setFilterType(null)}
          wide
        >
          <div className="space-y-4">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold">
                لا يوجد مستخدمين لعرضهم.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => setSelectedUser(user)}
                    className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {user.name || "بدون اسم"}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5" dir="ltr">
                          {user.phone || user.email || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Event Full Detail Modal */}
      {selectedEvent && (
        <Modal
          title={`تفاصيل حدث: ${selectedEvent.titleAr}`}
          onClose={() => setSelectedEvent(null)}
          wide
        >
          <div className="space-y-5 py-2" dir="rtl">
            {/* Header: User Info */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow shrink-0">
                  {selectedEvent.user?.avatar ? (
                    <img src={selectedEvent.user.avatar} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-7 h-7 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">{selectedEvent.user?.name || "بدون اسم"}</h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedEvent.user?.email || "—"}</p>
                  {selectedEvent.user?.phone && (
                    <p className="text-xs text-slate-500 font-medium font-mono" dir="ltr">{selectedEvent.user?.phone}</p>
                  )}
                </div>
              </div>

              {/* Contact buttons */}
              <div className="flex items-center gap-2">
                {selectedEvent.user?.email && (
                  <a
                    href={`mailto:${selectedEvent.user.email}`}
                    className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors"
                    title="مراسلة العميل"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                )}
                {selectedEvent.user?.phone && (
                  <a
                    href={`tel:${selectedEvent.user.phone}`}
                    className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors"
                    title="اتصال بالعميل"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Event Specific Card */}
            <div className={`p-4 rounded-2xl border ${
              selectedEvent.type === "cancelled_by_user"
                ? "bg-rose-50/50 border-rose-200"
                : selectedEvent.type === "activated"
                ? "bg-emerald-50/50 border-emerald-200"
                : "bg-slate-50 border-slate-200"
            } space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  نوع الحدث: {selectedEvent.titleAr}
                </span>
                <span className="text-xs text-slate-500 font-mono" dir="ltr">
                  {new Date(selectedEvent.createdAt).toLocaleString("ar-EG-u-nu-latn")}
                </span>
              </div>

              {selectedEvent.reason && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-500 block mb-1">السبب / الملاحظة:</span>
                  <p className="font-bold text-slate-800 leading-relaxed">{selectedEvent.reason}</p>
                </div>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 font-bold block mb-1">الباقة</span>
                <span className="font-bold text-slate-800 text-sm">{selectedEvent.planName || "—"}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 font-bold block mb-1">دورة الفوترة</span>
                <span className="font-bold text-slate-800 text-sm">{selectedEvent.billingPeriod || "شهري"}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 font-bold block mb-1">المبلغ المدفوع</span>
                <span className="font-bold text-slate-800 text-sm">{selectedEvent.amount ? `${selectedEvent.amount} ج.م` : "مجاني / بدون رسوم"}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 font-bold block mb-1">وسيلة الدفع</span>
                <span className="font-bold text-slate-800 text-sm">{selectedEvent.paymentMethod || "—"}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 font-bold block mb-1">عنوان IP</span>
                <span className="font-mono text-slate-700 text-xs" dir="ltr">{selectedEvent.ip || "—"}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 font-bold block mb-1">مصدر الحدث</span>
                <span className="font-bold text-indigo-700 text-xs uppercase">{selectedEvent.source || "System"}</span>
              </div>
            </div>

            {/* Raw Details / Fawaterak Data if available */}
            {selectedEvent.details && Object.keys(selectedEvent.details).length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span>عرض التفاصيل التقنية الكاملة (Metadata)</span>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <pre className="mt-2 p-3 bg-slate-900 text-emerald-400 text-xs rounded-xl overflow-x-auto max-h-48 font-mono" dir="ltr">
                  {JSON.stringify(selectedEvent.details, null, 2)}
                </pre>
              </details>
            )}

            {/* Account History & Admin Cancel Actions */}
            {selectedEvent.user && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    filterByAccount(selectedEvent.user);
                    setSelectedEvent(null);
                  }}
                  className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>عرض سجل اشتراكات هذا الحساب بالكامل</span>
                </button>

                {selectedEvent.type !== "cancelled_by_user" && selectedEvent.type !== "cancelled_by_admin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancelModalUser(selectedEvent.user);
                      setCancelReason("إلغاء الاشتراك من قبل الأدمن");
                    }}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <UserX className="w-4 h-4 text-rose-600" />
                    <span>إلغاء اشتراك العميل (بواسطة الأدمن)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* User Full Detail Modal */}
      {selectedUser && (
        <Modal
          title="بيانات العميل الكاملة"
          onClose={() => setSelectedUser(null)}
          wide
        >
          <div className="space-y-5 py-2" dir="rtl">
            {/* Header: Avatar + Name */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow shrink-0">
                {selectedUser.avatar ? (
                  <img src={selectedUser.avatar} className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">{selectedUser.name || "بدون اسم"}</h3>
                <p className="text-sm text-slate-500 font-medium">{selectedUser.email}</p>
                {selectedUser.phone && (
                  <p className="text-sm text-slate-500 font-medium" dir="ltr">{selectedUser.phone}</p>
                )}
              </div>
            </div>

            {/* Contact Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`mailto:${selectedUser.email}`}
                className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors justify-center"
              >
                <Mail className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-blue-700">إرسال إيميل</span>
              </a>
              {selectedUser.phone && (
                <a
                  href={`tel:${selectedUser.phone}`}
                  className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors justify-center"
                >
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700">اتصال</span>
                </a>
              )}
            </div>

            {/* Full Account History Button */}
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-purple-900">سجل اشتراكات الحساب بالكامل</p>
                <p className="text-[11px] text-purple-600">عرض جميع حركات وتاريخ اشتراكات هذا العميل التي قام بها أو قامت بها الإدارة</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  filterByAccount(selectedUser);
                  setSelectedUser(null);
                }}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>عرض السجل الكامل</span>
              </button>
            </div>

            {/* Admin Cancel Subscription Shortcut */}
            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-rose-800">إدارة اشتراك العميل</p>
                <p className="text-[11px] text-rose-600">إلغاء الاشتراك وإرجاع الحساب للباقة المجانية</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCancelModalUser(selectedUser);
                  setCancelReason("إلغاء الاشتراك من قبل الأدمن");
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>إلغاء الاشتراك بواسطة الأدمن</span>
              </button>
            </div>

            {/* Transaction Details */}
            {selectedUser._lastTransaction && (() => {
              const tx = selectedUser._lastTransaction;
              const txDate = tx.updatedAt || tx.createdAt;
              return (
                <div className="space-y-3">
                  <h4 className="font-black text-slate-700 text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-500" />
                    تفاصيل آخر معاملة مالية
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Status */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-500 font-bold mb-1">الحالة</p>
                      <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                        tx.status === "pending" ? "bg-amber-50 text-amber-700" :
                        tx.status === "cancelled" ? "bg-rose-50 text-rose-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {tx.status === "pending" ? "معلقة" : tx.status === "cancelled" ? "ملغية" : tx.status}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-500 font-bold mb-1">المبلغ</p>
                      <p className="font-black text-slate-800">{tx.amount?.toLocaleString("en-US")} ج.م</p>
                    </div>

                    {/* Method */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-500 font-bold mb-1">وسيلة الدفع</p>
                      <p className="font-bold text-slate-700 text-sm">{tx.paymentMethodName || `Method #${tx.paymentMethodId}` || "—"}</p>
                    </div>

                    {/* Date */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-500 font-bold mb-1">التاريخ</p>
                      <p className="font-bold text-slate-700 text-sm" dir="ltr">
                        {txDate ? new Date(txDate).toLocaleString("ar-EG-u-nu-latn") : "—"}
                      </p>
                    </div>

                    {/* Intent Key */}
                    {tx.intentKey && (
                      <div className="col-span-2 p-3 bg-white border border-slate-200 rounded-xl">
                        <p className="text-xs text-slate-500 font-bold mb-1">Intent Key (Fawaterak)</p>
                        <p className="font-mono text-xs text-slate-700 break-all" dir="ltr">{tx.intentKey}</p>
                      </div>
                    )}

                    {/* Fawaterak Invoice ID */}
                    {(tx.fawaterakResponse?.invoice_id || tx.fawaterakResponse?.transaction_id) && (
                      <div className="col-span-2 p-3 bg-white border border-slate-200 rounded-xl">
                        <p className="text-xs text-slate-500 font-bold mb-1">رقم الفاتورة (Fawaterak)</p>
                        <p className="font-mono text-sm font-black text-indigo-700" dir="ltr">
                          {tx.fawaterakResponse?.invoice_id || tx.fawaterakResponse?.transaction_id}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Raw Fawaterak Response */}
                  {tx.fawaterakResponse && (
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2 p-2">
                        <span>عرض الرد الكامل من فواتيرك</span>
                        <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <pre className="mt-2 p-3 bg-slate-900 text-green-400 text-xs rounded-xl overflow-x-auto max-h-48 font-mono" dir="ltr">
                        {JSON.stringify(tx.fawaterakResponse, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* Admin Cancel Subscription Confirmation Modal */}
      {cancelModalUser && (
        <Modal
          title="إلغاء اشتراك العميل بواسطة الإدارة"
          onClose={() => {
            if (!cancelling) {
              setCancelModalUser(null);
              setCancelReason("");
              setCancelSuccessMsg("");
            }
          }}
        >
          <div className="space-y-4 py-2" dir="rtl">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  تأكيد إلغاء اشتراك: {cancelModalUser.name || "العميل"}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  سيتم تحويل حساب العميل فوراً للخطة المجانية وتوثيق هذا الإلغاء في سجل أحداث الاشتراكات كـ "إلغاء الاشتراك من قبل الأدمن".
                </p>
              </div>
            </div>

            {cancelSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{cancelSuccessMsg}</span>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    سبب الإلغاء (يتم توثيقه في سجل النظام):
                  </label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="مثال: إلغاء بناءً على طلب العميل، مخالفة، إلغاء إداري..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                  />
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-bold">أسباب سريعة:</span>
                    {[
                      "إلغاء بناءً على رغبة العميل",
                      "إلغاء إداري من لوحة التحكم",
                      "استرداد المبلغ وإلغاء الخدمة",
                      "مخالفة شروط الاستخدام",
                    ].map((reasonText) => (
                      <button
                        key={reasonText}
                        type="button"
                        onClick={() => setCancelReason(reasonText)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        {reasonText}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={handleAdminCancelSubscription}
                    className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري إلغاء الاشتراك...</span>
                      </>
                    ) : (
                      <>
                        <UserX className="w-4 h-4" />
                        <span>تأكيد إلغاء الاشتراك الآن</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => {
                      setCancelModalUser(null);
                      setCancelReason("");
                    }}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    تراجع
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
