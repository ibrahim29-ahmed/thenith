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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { adminFetch } from "../services/adminApi.js";
import { io } from "socket.io-client";

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

    socket.on("connect_error", (err) => {
    });

    socket.on("newAuditLog", (newLog) => {
      // Apply active filters
      const currentCat = categoryRef.current;
      const currentLevel = levelRef.current;
      const currentSearch = searchRef.current.toLowerCase();

      if (currentCat && newLog.category !== currentCat) return;
      if (currentLevel && newLog.level !== currentLevel) return;
      if (currentSearch) {
        const matches =
          (newLog.message &&
            newLog.message.toLowerCase().includes(currentSearch)) ||
          (newLog.ip && newLog.ip.toLowerCase().includes(currentSearch)) ||
          (newLog.networkIp &&
            newLog.networkIp.toLowerCase().includes(currentSearch)) ||
          (newLog.path && newLog.path.toLowerCase().includes(currentSearch));
        if (!matches) return;
      }

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
          totalLogs: prev.totalLogs + 1,
          criticalThreats:
            newLog.level === "critical"
              ? prev.criticalThreats + 1
              : prev.criticalThreats,
          warnings:
            newLog.level === "warning" ? prev.warnings + 1 : prev.warnings,
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
    return "bg-slate-500/10 text-slate-500 border-slate-500/20";
  };

  const getCmdColor = (log) => {
    if (log.level === "critical") return "text-rose-400";
    if (log.level === "warning") return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-indigo-500" />
            Security & Audit Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Live monitoring of all API activity, intrusion attempts, and
            anomalies.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pause/Resume */}
          {isPaused ? (
            <button
              onClick={handleResume}
              className="relative px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Resume
              {bufferedCount > 0 && (
                <span className="absolute -top-2 -end-2 bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {bufferedCount > 99 ? "99+" : bufferedCount}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-xl text-sm font-bold hover:bg-amber-500/20 transition-colors flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              Pause Feed
            </button>
          )}
          {/* CMD / Table toggle */}
          <button
            onClick={() =>
              setViewMode((v) => (v === "table" ? "cmd" : "table"))
            }
            className="px-4 py-2 bg-slate-900 text-green-400 border border-slate-700 rounded-xl text-sm font-mono font-bold hover:bg-black transition-colors"
          >
            {" >_ "}
            {viewMode === "table" ? "CMD Mode" : "Table Mode"}
          </button>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Paused Banner */}
      {isPaused && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
          <Pause className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            Live feed is paused.{" "}
            <span className="font-bold">{bufferedCount} new events</span> are
            queued. Press Resume to load them.
          </p>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex overflow-x-auto gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
        {[
          { id: "", label: "الكل (All)" },
          { id: "panel_profile", label: "البانيل والبروفايل" },
          { id: "admin_dashboard", label: "الادمن داش بورد" },
          { id: "payments_subscriptions", label: "المدفوعات والاشتراكات" },
          { id: "store", label: "المتجر" },
          { id: "security", label: "Security" },
          { id: "system", label: "System" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategory(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors flex-1 md:flex-none text-center ${
              category === tab.id
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex-1 relative min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="البحث بواسطة الايبى (IP) للجهاز أو الشبكة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full ps-9 pe-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </form>
        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
          title="From"
        />
        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
          title="To"
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
        >
          <option value="">All Severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
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
                    Critical Threats
                  </p>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {stats.criticalThreats}
                  </h3>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Warnings
                  </p>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {stats.warnings}
                  </h3>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Total Logs
                  </p>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {stats.totalLogs}
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
                      Level
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      Message
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      URL / Path
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      Location & IP
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      Source
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      Time
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-6 py-8 text-center text-slate-500"
                      >
                        Loading logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-6 py-8 text-center text-slate-500"
                      >
                        No logs found.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log._id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${log.isExternal ? "bg-orange-50/30 dark:bg-orange-900/10" : ""}`}
                      >
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border capitalize ${getLevelColor(log.level)}`}
                          >
                            {log.level}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-200 max-w-[200px]">
                          <span title={log.message}>{log.message}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                              {log.method}
                            </span>
                            <span
                              className="text-slate-600 dark:text-slate-400 font-mono text-xs truncate max-w-[160px]"
                              title={log.fullUrl || log.path}
                            >
                              {log.path}
                            </span>
                          </div>
                          {log.queryString && (
                            <div className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[200px]">
                              ?{log.queryString}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {/* Location */}
                          <div className="text-slate-800 dark:text-slate-200 font-medium text-sm">
                            {log.location && log.location !== "Unknown"
                              ? log.location
                              : log.country && log.country !== "Unknown"
                              ? [log.country, log.governorate].filter(Boolean).join(", ")
                              : "Unknown"}
                          </div>
                          {/* Device IP */}
                          <div className="text-slate-500 font-mono text-xs mt-1 flex items-center gap-1">
                            <span className="text-slate-400">Device:</span>
                            <span className="text-blue-500 dark:text-blue-400">{log.ip}</span>
                          </div>
                          {/* Network IP (show only if different) */}
                          {log.networkIp && log.networkIp !== log.ip && log.networkIp !== "Unknown" && (
                            <div className="text-slate-500 font-mono text-xs flex items-center gap-1">
                              <span className="text-slate-400">Network:</span>
                              <span className="text-violet-500 dark:text-violet-400">{log.networkIp}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {log.isExternal ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-md">
                                <Globe className="w-3 h-3" /> Direct / External
                              </span>
                              {log.origin && (
                                <span className="text-xs text-slate-400 font-mono truncate max-w-[120px]" title={log.origin}>
                                  {log.origin}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                                <Wifi className="w-3 h-3" /> Frontend
                              </span>
                              {log.origin && (
                                <span className="text-xs text-slate-400 font-mono truncate max-w-[120px]" title={log.origin}>
                                  {log.origin}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-400 text-xs ">
                          {new Date(log.createdAt).toLocaleString("en-US")}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline text-sm"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ── CMD Terminal View ────────────────────────────────────────────── */
        <div
          className="bg-black rounded-xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col"
          style={{ height: "76vh" }}
        >
          {/* Terminal title bar */}
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <span className="text-slate-500 font-mono text-xs">
                root@thenith-security-server:~#
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isPaused && (
                <span className="text-xs font-mono text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded animate-pulse">
                  ⏸ PAUSED — {bufferedCount} queued
                </span>
              )}
              <span
                className={`text-xs font-mono ${isPaused ? "text-slate-600" : "text-emerald-500 animate-pulse"}`}
              >
                {isPaused ? "● OFFLINE" : "● LIVE"}
              </span>
            </div>
          </div>

          {/* Terminal body */}
          <div
            className="p-4 overflow-y-auto flex-1 font-mono text-sm leading-relaxed select-text"
            style={{ textShadow: "0 0 4px rgba(34,197,94,0.25)" }}
          >
            <div className="text-emerald-500 mb-3 opacity-70">
              Thenith Security Terminal v2.0 — Live packet capture active
              <br />
              ════════════════════════════════════════════════════════════════
            </div>

            {[...logs].reverse().map((log) => {
              const time = new Date(log.createdAt).toLocaleTimeString("en-US");
              const color = getCmdColor(log);
              const identity = log.userId
                ? log.userId.username ||
                  log.userId.email ||
                  "User#" + log.userId._id?.slice(-4)
                : "Guest";

              return (
                <div
                  key={log._id}
                  onClick={() => setSelectedLog(log)}
                  className="mb-1.5 hover:bg-white/5 px-2 py-1 rounded cursor-pointer transition-colors group"
                >
                  <span className="text-slate-600">[{time}]</span>{" "}
                  <span className={`font-bold ${color}`}>
                    [{log.level.toUpperCase()}]
                  </span>{" "}
                  {log.isExternal && (
                    <span className="text-orange-400">[🌐 EXT]</span>
                  )}{" "}
                  <span className="text-pink-400">[{identity}]</span>{" "}
                  <span className="text-blue-400">
                    [{log.ip}
                    {log.networkIp && log.networkIp !== log.ip
                      ? ` ? Net: ${log.networkIp}`
                      : ""}
                    ]
                  </span>{" "}
                  <span className="text-purple-400">
                    [{log.location || "Unknown"}]
                  </span>{" "}
                  <span className="text-yellow-600">{log.method}</span>{" "}
                  <span className="text-slate-400 text-xs">
                    {log.fullUrl || log.path}
                  </span>{" "}
                  <span className="text-slate-300">— {log.message}</span>
                  <span className="ms-2 opacity-0 group-hover:opacity-100 text-[10px] text-slate-600 transition-opacity">
                    [click for details]
                  </span>
                </div>
              );
            })}

            <div ref={terminalEndRef} className="flex items-center gap-2 mt-3">
              <span className="text-emerald-500">
                root@thenith-security-server:~#
              </span>
              <span
                className={`w-2 h-4 bg-emerald-500 inline-block ${!isPaused ? "animate-pulse" : "opacity-30"}`}
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
                    Event Details
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-xs border uppercase font-bold ${getLevelColor(selectedLog.level)}`}
                  >
                    {selectedLog.level}
                  </span>
                  {selectedLog.isExternal && (
                    <span className="flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                      <Globe className="w-3 h-3" /> External Request
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 p-2 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Message
                    </label>
                    <p className="font-medium text-slate-800 dark:text-slate-100 mt-1">
                      {selectedLog.message}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Category
                    </label>
                    <p className="font-medium text-slate-800 dark:text-slate-100 mt-1 capitalize">
                      {selectedLog.category}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Identity
                    </label>
                    <div className="mt-1">
                      {selectedLog.userId ? (
                        <div>
                          <p className="font-semibold text-indigo-500">
                            👤{" "}
                            {selectedLog.userId.username ||
                              selectedLog.userId.email}
                          </p>
                          {selectedLog.userId.email &&
                            selectedLog.userId.username && (
                              <p className="text-xs text-slate-400">
                                {selectedLog.userId.email}
                              </p>
                            )}
                          <p className="text-xs text-slate-400 font-mono">
                            {selectedLog.userId._id}
                          </p>
                        </div>
                      ) : (
                        <p className="text-slate-400">👻 Guest (زائر)</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Anomaly Score
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${selectedLog.anomalyScore >= 70 ? "bg-rose-500" : selectedLog.anomalyScore >= 40 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${selectedLog.anomalyScore}%` }}
                        />
                      </div>
                      <span
                        className={`text-sm font-bold ${selectedLog.anomalyScore >= 70 ? "text-rose-500" : selectedLog.anomalyScore >= 40 ? "text-amber-500" : "text-emerald-500"}`}
                      >
                        {selectedLog.anomalyScore}/100
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      IP Address
                    </label>
                    <div className="flex flex-col mt-1">
                      <p className="font-mono text-sm text-slate-800 dark:text-slate-100">
                        {selectedLog.ip}
                      </p>
                      {selectedLog.networkIp &&
                        selectedLog.networkIp !== selectedLog.ip && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-blue-500 uppercase">
                              Network Router:
                            </span>
                            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded">
                              {selectedLog.networkIp}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Location
                    </label>
                    <p className="font-medium text-slate-800 dark:text-slate-100 mt-1">
                      {selectedLog.location || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Method
                    </label>
                    <p className="font-mono font-bold text-indigo-500 mt-1">
                      {selectedLog.method}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Time
                    </label>
                    <p className="text-slate-800 dark:text-slate-100 mt-1">
                      {new Date(selectedLog.createdAt).toLocaleString("en-US")}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Full Request URL
                    </label>
                    <p className="font-mono text-sm text-blue-400 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg mt-1 break-all">
                      {selectedLog.fullUrl || selectedLog.path}
                      {selectedLog.queryString && (
                        <span className="text-slate-400">
                          ?{selectedLog.queryString}
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Origin
                    </label>
                    <p className="font-mono text-sm text-slate-800 dark:text-slate-200 mt-1">
                      {selectedLog.origin || "—"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Source
                    </label>
                    <p
                      className={`font-bold mt-1 ${selectedLog.isExternal ? "text-orange-500" : "text-emerald-500"}`}
                    >
                      {selectedLog.isExternal
                        ? "🌐 External (Outside Frontend)"
                        : "✅ Frontend"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Referrer
                    </label>
                    <p className="font-mono text-sm text-slate-800 dark:bg-slate-800 bg-slate-50 dark:text-slate-200 px-3 py-2 rounded-lg mt-1 break-all">
                      {selectedLog.referrer || "Direct (No referrer)"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      User Agent (Device/Browser)
                    </label>
                    <p className="font-mono text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg mt-1 break-all">
                      {selectedLog.userAgent || "—"}
                    </p>
                  </div>
                </div>

                {selectedLog.details &&
                  Object.keys(selectedLog.details).length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                        Payload / Metadata
                      </label>
                      <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
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
