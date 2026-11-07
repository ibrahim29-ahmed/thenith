import { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Search,
  Activity,
  ServerCrash,
  ChevronLeft,
  ChevronRight,
  X,
  Pause,
  Play,
  Globe,
  Wifi,
  User,
  Smartphone,
  Network,
  CreditCard,
  ShoppingBag,
  Layers,
  Settings,
  ShieldCheck,
  ExternalLink,
  MapPin,
  Clock,
  Phone,
  Mail,
  Copy,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { adminFetch } from "../services/adminApi.js";
import { io } from "socket.io-client";
import { Link } from "react-router-dom";

const CATEGORIES = [
  { id: "", label: "الكل (All)", icon: Layers },
  { id: "panel_profile", label: "البانيل والبروفايل", icon: User },
  { id: "admin_dashboard", label: "الادمن داش بورد", icon: ShieldAlert },
  { id: "payments_subscriptions", label: "المدفوعات والاشتراكات", icon: CreditCard },
  { id: "store", label: "المتجر", icon: ShoppingBag },
  { id: "security", label: "Security", icon: AlertTriangle },
  { id: "system", label: "System", icon: Settings },
];

const matchesCategory = (logCat, filterCat) => {
  if (!filterCat) return true;
  if (filterCat === logCat) return true;
  if (filterCat === "payments_subscriptions") {
    return [
      "payments_subscriptions",
      "payment",
      "payments",
      "subscription",
      "subscriptions",
      "plan",
      "plans",
      "checkout",
      "shipping-rates",
    ].includes(logCat);
  }
  if (filterCat === "panel_profile") {
    return [
      "panel_profile",
      "panel",
      "profile",
      "auth",
      "user",
      "users",
      "card",
      "cards",
      "request",
    ].includes(logCat);
  }
  if (filterCat === "admin_dashboard") {
    return ["admin_dashboard", "admin"].includes(logCat);
  }
  if (filterCat === "store") {
    return ["store", "product", "products", "order", "orders", "coupon"].includes(logCat);
  }
  if (filterCat === "system") {
    return ["system", "settings", "notification"].includes(logCat);
  }
  return false;
};

const matchesSearch = (log, s) => {
  if (!s) return true;
  const term = s.toLowerCase();
  return (
    (log.message && log.message.toLowerCase().includes(term)) ||
    (log.ip && log.ip.toLowerCase().includes(term)) ||
    (log.networkIp && log.networkIp.toLowerCase().includes(term)) ||
    (log.path && log.path.toLowerCase().includes(term)) ||
    (log.location && log.location.toLowerCase().includes(term)) ||
    (log.country && log.country.toLowerCase().includes(term)) ||
    (log.userId &&
      ((log.userId.name && log.userId.name.toLowerCase().includes(term)) ||
        (log.userId.username && log.userId.username.toLowerCase().includes(term)) ||
        (log.userId.email && log.userId.email.toLowerCase().includes(term)) ||
        (log.userId.phone && log.userId.phone.toLowerCase().includes(term)) ||
        (log.userId.publicId && log.userId.publicId.toLowerCase().includes(term))))
  );
};

export default function SecurityAudit() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [viewMode, setViewMode] = useState("cmd");
  const terminalEndRef = useRef(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [copiedIp, setCopiedIp] = useState(null);

  // ── Pause / Resume ────────────────────────────────────────────────────────
  const [isPaused, setIsPaused] = useState(false);
  const [bufferedCount, setBufferedCount] = useState(0);
  const pauseBuffer = useRef([]);
  const isPausedRef = useRef(false);

  // Refs for socket filtering
  const categoryRef = useRef(category);
  const levelRef = useRef(level);
  const searchRef = useRef(search);

  useEffect(() => {
    categoryRef.current = category;
  }, [category]);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const handlePause = () => setIsPaused(true);

  const handleResume = () => {
    const buffered = [...pauseBuffer.current];
    pauseBuffer.current = [];
    setBufferedCount(0);
    setIsPaused(false);
    if (buffered.length > 0) {
      setLogs((prev) => [...buffered, ...prev].slice(0, 200));
      setStats((prev) => {
        if (!prev) return prev;
        let { criticalThreats: c, warnings: w, totalLogs: t } = prev;
        buffered.forEach((l) => {
          t++;
          if (l.level === "critical") c++;
          if (l.level === "warning") w++;
        });
        return { ...prev, totalLogs: t, criticalThreats: c, warnings: w };
      });
    }
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchData();
  }, [page, level, category, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        adminFetch(
          "/admin/audit/logs?" +
            new URLSearchParams({
              page,
              level,
              category,
              search,
              startDate,
              endDate,
            }).toString(),
        ),
        adminFetch("/admin/audit/stats"),
      ]);
      setLogs(logsRes.logs || []);
      setTotalPages(logsRes.pages || 1);
      setStats(statsRes);
    } catch (err) {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  // ── Socket Live Feed ──────────────────────────────────────────────────────
  useEffect(() => {
    const adminToken = localStorage.getItem("admin_token");
    const baseUrl = import.meta.env.VITE_API_BASE_URL.replace("/api", "");

    const socket = io(baseUrl, {
      auth: { adminToken },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("joinAdmin");
    });

    socket.on("newAuditLog", (newLog) => {
      const currentCat = categoryRef.current;
      const currentLevel = levelRef.current;
      const currentSearch = searchRef.current;

      if (!matchesCategory(newLog.category, currentCat)) return;
      if (currentLevel && newLog.level !== currentLevel) return;
      if (!matchesSearch(newLog, currentSearch)) return;

      if (isPausedRef.current) {
        pauseBuffer.current = [newLog, ...pauseBuffer.current].slice(0, 500);
        setBufferedCount((c) => c + 1);
        return;
      }
      setLogs((prev) => (page === 1 ? [newLog, ...prev].slice(0, 100) : prev));
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          totalLogs: (prev.totalLogs || 0) + 1,
          criticalThreats:
            newLog.level === "critical"
              ? (prev.criticalThreats || 0) + 1
              : prev.criticalThreats,
          warnings:
            newLog.level === "warning" ? (prev.warnings || 0) + 1 : prev.warnings,
        };
      });
    });

    return () => socket.disconnect();
  }, [page]);

  // ── Auto-scroll terminal ──────────────────────────────────────────────────
  useEffect(() => {
    if (viewMode === "cmd" && !isPaused && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, viewMode]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getLevelColor = (l) => {
    if (l === "critical")
      return "bg-rose-500/10 text-rose-500 border-rose-500/20";
    if (l === "warning")
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  };

  const getCmdColor = (log) => {
    if (log.level === "critical") return "text-rose-400";
    if (log.level === "warning") return "text-amber-400";
    return "text-emerald-400";
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case "panel_profile":
      case "auth":
      case "profile":
      case "panel":
        return {
          label: "البانيل والبروفايل",
          classes: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
          icon: User,
        };
      case "admin_dashboard":
      case "admin":
        return {
          label: "الادمن داش بورد",
          classes: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
          icon: ShieldAlert,
        };
      case "payments_subscriptions":
      case "payment":
      case "subscription":
      case "plans":
        return {
          label: "المدفوعات والاشتراكات",
          classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          icon: CreditCard,
        };
      case "store":
      case "product":
      case "order":
        return {
          label: "المتجر",
          classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          icon: ShoppingBag,
        };
      case "security":
        return {
          label: "Security",
          classes: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
          icon: AlertTriangle,
        };
      case "system":
      default:
        return {
          label: "System",
          classes: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
          icon: Settings,
        };
    }
  };

  const copyText = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIp(key);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-indigo-500" />
            التدقيق الأمني وسجلات العمليات (Security & Audit Logs)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            متابعة فورية ومباشرة لكافة أنشطة المستخدمين، الشبكة، الأجهزة، والعمليات الحساسة في المنصة.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pause/Resume */}
          {isPaused ? (
            <button
              onClick={handleResume}
              className="relative px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
            >
              <Play className="w-4 h-4" />
              استئناف البث (Resume)
              {bufferedCount > 0 && (
                <span className="absolute -top-2 -end-2 bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {bufferedCount > 99 ? "99+" : bufferedCount}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="px-4 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl text-sm font-bold hover:bg-amber-500/20 transition-colors flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              إيقاف مؤقت (Pause Feed)
            </button>
          )}

          {/* CMD / Table toggle */}
          <button
            onClick={() =>
              setViewMode((v) => (v === "table" ? "cmd" : "table"))
            }
            className="px-4 py-2 bg-slate-900 text-emerald-400 border border-slate-700 rounded-xl text-sm font-mono font-bold hover:bg-black transition-colors flex items-center gap-2"
          >
            <span>&gt;_</span>
            {viewMode === "table" ? "وضع الشاشة السوداء (CMD Mode)" : "وضع الجدول (Table Mode)"}
          </button>

          <button
            onClick={fetchData}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            تحديث
          </button>
        </div>
      </div>

      {/* Paused Banner */}
      {isPaused && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
          <Pause className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            البث المباشر متوقف مؤقتاً. تم حجز{" "}
            <span className="font-bold">{bufferedCount} عمليات جديدة</span> في الانتظار. اضغط استئناف لعرضها.
          </p>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex overflow-x-auto gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
        {CATEGORIES.map((tab) => {
          const Icon = tab.icon;
          const isActive = category === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setCategory(tab.id);
                setPage(1);
              }}
              className={`px-4 py-2 text-sm font-bold rounded-xl whitespace-nowrap transition-all flex items-center justify-center gap-2 flex-1 md:flex-none ${
                isActive
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex-1 relative min-w-[240px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="البحث باسم المستخدم، البريد، الهاتف، المعرف، أو الـ IP للجهاز والشبكة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full ps-9 pe-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          />
        </form>
        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
          title="من تاريخ"
        />
        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
          title="إلى تاريخ"
        />
        <select
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            setPage(1);
          }}
          className="py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none font-medium"
        >
          <option value="">كافة المستويات (All Levels)</option>
          <option value="info">معلومات (Info)</option>
          <option value="warning">تحذير (Warning)</option>
          <option value="critical">خطر أمني (Critical)</option>
        </select>
      </div>

      {viewMode === "table" ? (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <ServerCrash className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    تهديدات أمنية محظورة (Critical)
                  </p>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {stats.criticalThreats || 0}
                  </h3>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    تنبيهات وأخطاء (Warnings)
                  </p>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {stats.warnings || 0}
                  </h3>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    إجمالي السجلات (Total Logs)
                  </p>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {stats.totalLogs || 0}
                  </h3>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      المستوى
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      القسم
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      المستخدم (Identity)
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      العملية / المسار
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      IP الجهاز والشبكة
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      المصدر
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      التوقيت
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      التفاصيل
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                        جاري تحميل السجلات والبيانات...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                        لا توجد سجلات مطابقة للفلاتر المحددة حالياً.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const catBadge = getCategoryBadge(log.category);
                      const CatIcon = catBadge.icon;
                      const devIp = log.ip || "127.0.0.1";
                      const netIp = log.networkIp || devIp;

                      return (
                        <tr
                          key={log._id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                            log.isExternal ? "bg-orange-50/20 dark:bg-orange-950/10" : ""
                          }`}
                        >
                          {/* Level */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border uppercase ${getLevelColor(
                                log.level,
                              )}`}
                            >
                              {log.level}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${catBadge.classes}`}
                            >
                              <CatIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>{catBadge.label}</span>
                            </span>
                          </td>

                          {/* User Identity */}
                          <td className="px-5 py-4">
                            {log.userId ? (
                              <div className="flex items-center gap-2.5">
                                {log.userId.avatar ? (
                                  <img
                                    src={log.userId.avatar}
                                    alt=""
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-500/20">
                                    {(log.userId.name || log.userId.username || "U")[0]?.toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div
                                    className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate max-w-[150px]"
                                    title={log.userId.name || log.userId.username}
                                  >
                                    {log.userId.name || log.userId.username || "مستخدم مسجل"}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono truncate max-w-[150px]">
                                    {log.userId.email || (log.userId.username ? `@${log.userId.username}` : "")}
                                  </div>
                                  {log.userId.phone && (
                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono truncate max-w-[150px]">
                                      📞 {log.userId.phone}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
                                <span>زائر (Guest)</span>
                              </div>
                            )}
                          </td>

                          {/* Action & Path */}
                          <td className="px-5 py-4 max-w-[220px]">
                            <div
                              className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate"
                              title={log.message}
                            >
                              {log.message}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                {log.method}
                              </span>
                              <span
                                className="text-slate-500 font-mono text-[11px] truncate max-w-[160px]"
                                title={log.fullUrl || log.path}
                              >
                                {log.path}
                              </span>
                            </div>
                          </td>

                          {/* Device IP & Network IP */}
                          <td className="px-5 py-4">
                            <div className="space-y-1 font-mono text-xs">
                              {/* Device IP */}
                              <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md w-fit">
                                <Smartphone className="w-3 h-3 shrink-0" />
                                <span className="text-[10px] uppercase font-bold text-blue-500/80">جهاز:</span>
                                <span className="font-bold">{devIp}</span>
                              </div>
                              {/* Network IP */}
                              <div className="flex items-center gap-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-md w-fit">
                                <Network className="w-3 h-3 shrink-0" />
                                <span className="text-[10px] uppercase font-bold text-purple-500/80">شبكة:</span>
                                <span className="font-bold">{netIp}</span>
                              </div>
                              {/* Location */}
                              {log.location && log.location !== "Unknown" && (
                                <div className="text-[11px] text-slate-400 flex items-center gap-1 font-sans">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate max-w-[140px]">{log.location}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Source */}
                          <td className="px-5 py-4">
                            {log.isExternal ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-md">
                                <Globe className="w-3 h-3" /> خارجي (Direct)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                                <Wifi className="w-3 h-3" /> داخلي (Frontend)
                              </span>
                            )}
                          </td>

                          {/* Time */}
                          <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-xs font-mono whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString("ar-EG-u-nu-latn", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            })}
                          </td>

                          {/* Details Button */}
                          <td className="px-5 py-4">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-xs"
                            >
                              عرض
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                صفحة {page} من {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                  title="السابق"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                  title="التالي"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ── CMD Terminal View ────────────────────────────────────────────── */
        <div
          className="bg-black rounded-xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col font-mono"
          style={{ height: "76vh" }}
        >
          {/* Terminal Title Bar */}
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <span className="text-slate-500 text-xs">
                root@thenith-security-core:~#
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isPaused && (
                <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded animate-pulse">
                  ⏸ PAUSED — {bufferedCount} queued
                </span>
              )}
              <span
                className={`text-xs ${
                  isPaused ? "text-slate-600" : "text-emerald-500 animate-pulse"
                }`}
              >
                {isPaused ? "● OFFLINE" : "● LIVE MONITORING"}
              </span>
            </div>
          </div>

          {/* Terminal Body */}
          <div
            className="p-4 overflow-y-auto flex-1 text-sm leading-relaxed select-text"
            style={{ textShadow: "0 0 4px rgba(34,197,94,0.25)" }}
          >
            <div className="text-emerald-500 mb-3 opacity-70">
              Thenith Security Terminal v3.0 — Multi-Category Live Telemetry & Device Packet Inspection
              <br />
              ══════════════════════════════════════════════════════════════════════════════════════════
            </div>

            {[...logs].reverse().map((log) => {
              const time = new Date(log.createdAt).toLocaleTimeString("ar-EG-u-nu-latn");
              const color = getCmdColor(log);
              const catBadge = getCategoryBadge(log.category);
              const devIp = log.ip || "127.0.0.1";
              const netIp = log.networkIp || devIp;

              let userText = "Guest";
              if (log.userId) {
                userText = `${log.userId.name || log.userId.username || "User"}${
                  log.userId.phone ? ` (${log.userId.phone})` : ""
                }`;
              }

              return (
                <div
                  key={log._id}
                  onClick={() => setSelectedLog(log)}
                  className="mb-1.5 hover:bg-white/5 px-2 py-1 rounded cursor-pointer transition-colors group text-xs md:text-sm"
                >
                  <span className="text-slate-600">[{time}]</span>{" "}
                  <span className={`font-bold ${color}`}>
                    [{log.level.toUpperCase()}]
                  </span>{" "}
                  <span className="text-indigo-400">[{catBadge.label}]</span>{" "}
                  {log.isExternal && (
                    <span className="text-orange-400">[EXT]</span>
                  )}{" "}
                  <span className="text-pink-400">[{userText}]</span>{" "}
                  <span className="text-cyan-400">
                    [📱 Dev: {devIp} | 🌐 Net: {netIp}]
                  </span>{" "}
                  <span className="text-purple-400">
                    [{log.location || log.country || "Unknown"}]
                  </span>{" "}
                  <span className="text-yellow-500 font-bold">{log.method}</span>{" "}
                  <span className="text-slate-400">{log.path}</span>{" "}
                  <span className="text-slate-300">— {log.message}</span>
                  <span className="ms-2 opacity-0 group-hover:opacity-100 text-[10px] text-slate-500 transition-opacity">
                    [تفاصيل]
                  </span>
                </div>
              );
            })}

            <div ref={terminalEndRef} className="flex items-center gap-2 mt-3">
              <span className="text-emerald-500">
                root@thenith-security-core:~#
              </span>
              <span
                className={`w-2 h-4 bg-emerald-500 inline-block ${
                  !isPaused ? "animate-pulse" : "opacity-30"
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Details Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                    تفاصيل السجل والتدقيق الأمني
                  </h3>
                  <span
                    className={`px-2.5 py-1 rounded text-xs border uppercase font-bold ${getLevelColor(
                      selectedLog.level,
                    )}`}
                  >
                    {selectedLog.level}
                  </span>
                  {selectedLog.isExternal ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded">
                      <Globe className="w-3 h-3" /> خارجي (Direct)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                      <Wifi className="w-3 h-3" /> داخلي (Frontend)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 p-2 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5">
                {/* 1. User Identity Card */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-4 h-4 text-indigo-500" />
                      بيانات المستخدم المسجل (Registered User Details)
                    </span>
                    {selectedLog.userId && (
                      <Link
                        to={`/users?search=${encodeURIComponent(
                          selectedLog.userId.email || selectedLog.userId.username || "",
                        )}`}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>فتح بروفايل المستخدم</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>

                  {selectedLog.userId ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        {selectedLog.userId.avatar ? (
                          <img
                            src={selectedLog.userId.avatar}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-lg flex items-center justify-center shrink-0 border border-indigo-500/20">
                            {(selectedLog.userId.name || selectedLog.userId.username || "U")[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">
                            {selectedLog.userId.name || "مستخدم مسجل"}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">
                            @{selectedLog.userId.username || "بدون اسم مستخدم"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {selectedLog.userId.email || "—"}
                          </span>
                        </div>
                        {selectedLog.userId.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              {selectedLog.userId.phone}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">الصلاحية:</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                            {selectedLog.userId.role || "user"}
                          </span>
                          <span className="text-slate-400 ms-2">الحالة:</span>
                          <span
                            className={`font-bold ${
                              selectedLog.userId.isActive !== false
                                ? "text-emerald-500"
                                : "text-rose-500"
                            }`}
                          >
                            {selectedLog.userId.isActive !== false ? "نشط" : "معطل"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-sm flex items-center gap-2 py-1">
                      <span className="text-lg">👻</span>
                      <span>زائر غير مسجل (Guest Visitor) — لم يتم تسجيل الدخول أثناء تنفيذ هذا الطلب.</span>
                    </div>
                  )}
                </div>

                {/* 2. Device & Network IP Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Device IP */}
                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4" />
                        آي بي الجهاز (Device IP)
                      </span>
                      <button
                        onClick={() => copyText(selectedLog.ip, "dev")}
                        className="text-blue-500 hover:text-blue-600 p-1"
                        title="نسخ"
                      >
                        {copiedIp === "dev" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-base font-bold text-blue-700 dark:text-blue-300">
                      {selectedLog.ip || "127.0.0.1"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      العنوان المباشر للجهاز المصدر للطلب.
                    </p>
                  </div>

                  {/* Network IP */}
                  <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                        <Network className="w-4 h-4" />
                        آي بي الشبكة والراوتر (Network Router IP)
                      </span>
                      <button
                        onClick={() =>
                          copyText(selectedLog.networkIp || selectedLog.ip, "net")
                        }
                        className="text-purple-500 hover:text-purple-600 p-1"
                        title="نسخ"
                      >
                        {copiedIp === "net" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-base font-bold text-purple-700 dark:text-purple-300">
                      {selectedLog.networkIp || selectedLog.ip || "127.0.0.1"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      عنوان الراوتر / مزود خدمة الإنترنت (ISP Gateway).
                    </p>
                  </div>
                </div>

                {/* 3. Event Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      الرسالة والوصف
                    </label>
                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">
                      {selectedLog.message}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      القسم (Category)
                    </label>
                    <div className="mt-1">
                      {(() => {
                        const b = getCategoryBadge(selectedLog.category);
                        const BIcon = b.icon;
                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold border ${b.classes}`}
                          >
                            <BIcon className="w-3.5 h-3.5" />
                            <span>{b.label}</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      الموقع الجغرافي
                    </label>
                    <p className="font-medium text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>{selectedLog.location || selectedLog.country || "غير محدد (Unknown)"}</span>
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      درجة الخطر (Anomaly Score)
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            selectedLog.anomalyScore >= 70
                              ? "bg-rose-500"
                              : selectedLog.anomalyScore >= 40
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${selectedLog.anomalyScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {selectedLog.anomalyScore}/100
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      نوع الطلب والحالة (HTTP Method)
                    </label>
                    <p className="font-mono font-bold text-indigo-500 mt-1">
                      {selectedLog.method} — Status:{" "}
                      {selectedLog.details?.statusCode || "200"}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      التوقيت
                    </label>
                    <p className="text-slate-700 dark:text-slate-300 mt-1 text-xs font-mono">
                      {new Date(selectedLog.createdAt).toLocaleString("ar-EG-u-nu-latn")}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      المسار الكامل (Full URL)
                    </label>
                    <p className="font-mono text-xs text-blue-500 dark:text-blue-400 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl mt-1 break-all">
                      {selectedLog.fullUrl || selectedLog.path}
                      {selectedLog.queryString && (
                        <span className="text-slate-400">?{selectedLog.queryString}</span>
                      )}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      معلومات الجهاز والمتصفح (User Agent)
                    </label>
                    <p className="font-mono text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl mt-1 break-all">
                      {selectedLog.userAgent || "—"}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      المصدر (Origin)
                    </label>
                    <p className="font-mono text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {selectedLog.origin || "—"}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      المرجع (Referrer)
                    </label>
                    <p className="font-mono text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {selectedLog.referrer || "Direct (مباشر)"}
                    </p>
                  </div>
                </div>

                {/* 4. Payload / Details JSON */}
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                      بيانات وتفاصيل المعاملة (Payload / Metadata)
                    </label>
                    <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-400 overflow-x-auto max-h-48">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
