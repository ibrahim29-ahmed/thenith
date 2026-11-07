import { useState, useEffect, useCallback } from "react";
import {
  Gift,
  Users,
  CreditCard,
  Percent,
  TrendingUp,
  Download,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  PackageCheck,
  Settings,
  Save,
  Loader2,
  RefreshCw,
  X,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import {
  fetchReferralStats,
  fetchReferrals,
  fetchRewardLedger,
  createManualReward,
  fetchNfcFulfillments,
  updateNfcFulfillment,
  fetchReferralSettings,
  updateReferralSettings,
  exportReferralsCsv,
} from "../services/adminApi.js";

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full flex flex-col max-h-[90vh] ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function ReferralsManager() {
  const [activeTab, setActiveTab] = useState("referrals"); // "referrals" | "rewards" | "nfc" | "settings"
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Tab 1: Referrals State
  const [referrals, setReferrals] = useState([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [referralSearch, setReferralSearch] = useState("");
  const [referralStatus, setReferralStatus] = useState("all");
  const [referralsPage, setReferralsPage] = useState(1);
  const [referralsTotalPages, setReferralsTotalPages] = useState(1);

  // Tab 2: Rewards State
  const [rewards, setRewards] = useState([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [rewardTypeFilter, setRewardTypeFilter] = useState("all");
  const [rewardStatusFilter, setRewardStatusFilter] = useState("all");
  const [rewardsPage, setRewardsPage] = useState(1);
  const [rewardsTotalPages, setRewardsTotalPages] = useState(1);
  const [showManualRewardModal, setShowManualRewardModal] = useState(false);
  const [manualRewardForm, setManualRewardForm] = useState({
    userId: "",
    discountPercent: 10,
    rewardType: "monthly_discount",
    reason: "",
    validityDays: 30,
  });
  const [submittingReward, setSubmittingReward] = useState(false);

  // Tab 3: NFC Fulfillments State
  const [fulfillments, setFulfillments] = useState([]);
  const [loadingFulfillments, setLoadingFulfillments] = useState(false);
  const [nfcStatusFilter, setNfcStatusFilter] = useState("all");
  const [nfcPage, setNfcPage] = useState(1);
  const [nfcTotalPages, setNfcTotalPages] = useState(1);
  const [selectedFulfillment, setSelectedFulfillment] = useState(null);
  const [nfcUpdateForm, setNfcUpdateForm] = useState({
    status: "",
    trackingNumber: "",
    carrier: "",
    adminNotes: "",
  });
  const [updatingNfc, setUpdatingNfc] = useState(false);

  // Tab 4: Settings State
  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState(null);

  // 1. Load Stats
  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetchReferralStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error("Error loading referral stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // 2. Load Referrals Table
  const loadReferrals = useCallback(async () => {
    try {
      setLoadingReferrals(true);
      const res = await fetchReferrals({
        page: referralsPage,
        limit: 15,
        status: referralStatus,
        search: referralSearch,
      });
      if (res.success) {
        setReferrals(res.data || []);
        setReferralsTotalPages(res.pages || 1);
      }
    } catch (err) {
      console.error("Error loading referrals:", err);
    } finally {
      setLoadingReferrals(false);
    }
  }, [referralsPage, referralStatus, referralSearch]);

  // 3. Load Rewards Ledger
  const loadRewards = useCallback(async () => {
    try {
      setLoadingRewards(true);
      const res = await fetchRewardLedger({
        page: rewardsPage,
        limit: 15,
        rewardType: rewardTypeFilter,
        status: rewardStatusFilter,
      });
      if (res.success) {
        setRewards(res.data || []);
        setRewardsTotalPages(res.pages || 1);
      }
    } catch (err) {
      console.error("Error loading rewards:", err);
    } finally {
      setLoadingRewards(false);
    }
  }, [rewardsPage, rewardTypeFilter, rewardStatusFilter]);

  // 4. Load NFC Fulfillments
  const loadFulfillments = useCallback(async () => {
    try {
      setLoadingFulfillments(true);
      const res = await fetchNfcFulfillments({
        page: nfcPage,
        limit: 15,
        status: nfcStatusFilter,
      });
      if (res.success) {
        setFulfillments(res.data || []);
        setNfcTotalPages(res.pages || 1);
      }
    } catch (err) {
      console.error("Error loading fulfillments:", err);
    } finally {
      setLoadingFulfillments(false);
    }
  }, [nfcPage, nfcStatusFilter]);

  // 5. Load Settings
  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await fetchReferralSettings();
      if (res.success) {
        setSettings(res.settings);
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === "referrals") loadReferrals();
    else if (activeTab === "rewards") loadRewards();
    else if (activeTab === "nfc") loadFulfillments();
    else if (activeTab === "settings") loadSettings();
  }, [activeTab, loadReferrals, loadRewards, loadFulfillments]);

  // CSV Export handler
  const handleExportCsv = async () => {
    try {
      await exportReferralsCsv();
    } catch (err) {
      console.error("Error exporting referrals CSV:", err);
      alert("حدث خطأ أثناء تصدير ملف CSV");
    }
  };

  // Submit Manual Reward
  const handleCreateManualRewardSubmit = async (e) => {
    e.preventDefault();
    if (!manualRewardForm.userId || !manualRewardForm.discountPercent) {
      alert("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    try {
      setSubmittingReward(true);
      await createManualReward(manualRewardForm);
      setShowManualRewardModal(false);
      setManualRewardForm({
        userId: "",
        discountPercent: 10,
        rewardType: "monthly_discount",
        reason: "",
        validityDays: 30,
      });
      loadRewards();
      loadStats();
    } catch (err) {
      console.error("Error creating manual reward:", err);
      alert(err.response?.data?.error || "تعذر إصدار المكافأة اليدوية");
    } finally {
      setSubmittingReward(false);
    }
  };

  // Update NFC Fulfillment
  const handleOpenNfcModal = (item) => {
    setSelectedFulfillment(item);
    setNfcUpdateForm({
      status: item.status || "approved",
      trackingNumber: item.trackingNumber || "",
      carrier: item.carrier || "",
      adminNotes: item.adminNotes || "",
    });
  };

  const handleUpdateNfcSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFulfillment) return;
    try {
      setUpdatingNfc(true);
      await updateNfcFulfillment(selectedFulfillment._id, nfcUpdateForm);
      setSelectedFulfillment(null);
      loadFulfillments();
      loadStats();
    } catch (err) {
      console.error("Error updating fulfillment:", err);
      alert(err.response?.data?.error || "تعذر تحديث حالة الشحن");
    } finally {
      setUpdatingNfc(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setSettingsMessage(null);
      const res = await updateReferralSettings(settings);
      if (res.success) {
        setSettingsMessage({ type: "success", text: "تم حفظ الإعدادات بنجاح!" });
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      setSettingsMessage({
        type: "error",
        text: err.response?.data?.error || "تعذر حفظ الإعدادات",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Gift className="w-7 h-7 text-indigo-600" />
            <span>إدارة الإحالات والمكافآت (Referrals & Rewards)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            متابعة إحالات المستخدمين، الخصومات الشهرية، كروت NFC المجانية، والتحكم بإعدادات البرنامج.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تصدير تقرير CSV</span>
          </button>

          <button
            onClick={() => setShowManualRewardModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>منح مكافأة يدوية</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">إجمالي المسجلين</span>
          <div className="text-2xl font-black text-slate-800 mt-2">
            {loadingStats ? "..." : stats?.totalRegistered ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">عبر روابط الإحالة</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">الإحالات الناجحة</span>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {loadingStats ? "..." : stats?.totalSuccessful ?? 0}
          </div>
          <span className="text-[11px] text-emerald-600/80 font-bold mt-1">مشتركون مؤهلون</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">معدل التحويل</span>
          <div className="text-2xl font-black text-indigo-600 mt-2">
            {loadingStats ? "..." : `${stats?.conversionRate ?? 0}%`}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">نسبة الدفع للاشتراك</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">إيرادات الإحالات</span>
          <div className="text-2xl font-black text-slate-800 mt-2 font-mono">
            {loadingStats ? "..." : `${(stats?.totalRevenue ?? 0).toLocaleString("en-US")} ج.م`}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">مبيعات اشتراكات فعلية</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">إجمالي الخصومات</span>
          <div className="text-2xl font-black text-rose-600 mt-2 font-mono">
            {loadingStats ? "..." : `${(stats?.totalDiscountsGiven ?? 0).toLocaleString("en-US")} ج.م`}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">قيمة الخصومات المستفادة</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">كروت NFC معلقة</span>
          <div className="text-2xl font-black text-amber-600 mt-2">
            {loadingStats ? "..." : stats?.nfcPending ?? 0}
          </div>
          <span className="text-[11px] text-amber-600/80 font-bold mt-1">بانتظار الشحن/المراجعة</span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-6">
        {[
          { id: "referrals", label: "سجل الإحالات", icon: Users },
          { id: "rewards", label: "سجل المكافآت والمحفظة", icon: Percent },
          { id: "nfc", label: "شحن كروت NFC المجانية", icon: CreditCard },
          { id: "settings", label: "إعدادات البرنامج", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-4 font-bold text-sm transition-all border-b-2 -mb-px ${
                isActive
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ──────────────── TAB 1: REFERRALS REGISTRY ──────────────── */}
      {activeTab === "referrals" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={referralSearch}
                onChange={(e) => setReferralSearch(e.target.value)}
                placeholder="بحث بالاسم، الإيميل، أو كود الإحالة..."
                className="w-full pr-10 pl-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={referralStatus}
                onChange={(e) => setReferralStatus(e.target.value)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="successful">مشترك مؤهل (ناجح)</option>
                <option value="registered">مسجل (بانتظار الاشتراك)</option>
              </select>

              <button
                onClick={loadReferrals}
                className="p-2.5 rounded-2xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
                title="تحديث الجدول"
              >
                <RefreshCw className={`w-4 h-4 ${loadingReferrals ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Table */}
          {loadingReferrals ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
              <span className="text-xs font-bold">جاري تحميل سجل الإحالات...</span>
            </div>
          ) : referrals.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm font-medium">
              لا توجد إحالات مطابقة لخيارات البحث المحددة.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="pb-3 pr-2">كود الإحالة</th>
                    <th className="pb-3">المستخدم الداعي (Referrer)</th>
                    <th className="pb-3">الصديق المدعو (Invitee)</th>
                    <th className="pb-3">حالة الإحالة</th>
                    <th className="pb-3">تاريخ التسجيل</th>
                    <th className="pb-3">تاريخ الاشتراك</th>
                    <th className="pb-3">رقم الفاتورة</th>
                    <th className="pb-3 pl-2">مكافأة الإحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referrals.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 pr-2 font-mono font-bold text-indigo-600">
                        {r.referralCode}
                      </td>
                      <td className="py-3.5 font-bold text-slate-800">
                        <div>{r.referrerId?.name || "مستخدم غير معروف"}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{r.referrerId?.email}</div>
                      </td>
                      <td className="py-3.5 font-bold text-slate-800">
                        <div>{r.inviteeId?.name || "صديق مدعو"}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{r.inviteeId?.email}</div>
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            r.status === "successful"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {r.status === "successful" ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>مشترك مؤهل</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>مسجل فقط</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-500">
                        {r.registeredAt ? new Date(r.registeredAt).toLocaleDateString("ar-EG-u-nu-latn") : "-"}
                      </td>
                      <td className="py-3.5 text-slate-500">
                        {r.firstPurchaseAt ? new Date(r.firstPurchaseAt).toLocaleDateString("ar-EG-u-nu-latn") : "-"}
                      </td>
                      <td className="py-3.5 font-mono text-slate-700">
                        {r.invoiceNumber || "-"}
                      </td>
                      <td className="py-3.5 pl-2 font-bold text-emerald-600">
                        {r.referrerRewardIssued?.percent ? `خصم ${r.referrerRewardIssued.percent}%` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {referralsTotalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-bold text-slate-600">
              <span>
                صفحة {referralsPage} من {referralsTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={referralsPage <= 1}
                  onClick={() => setReferralsPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  disabled={referralsPage >= referralsTotalPages}
                  onClick={() => setReferralsPage((p) => p + 1)}
                  className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 2: REWARDS LEDGER ──────────────── */}
      {activeTab === "rewards" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={rewardTypeFilter}
                onChange={(e) => setRewardTypeFilter(e.target.value)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">جميع أنواع المكافآت</option>
                <option value="invitee_discount">خصم ترحيبي للمدعوين (10%)</option>
                <option value="monthly_discount">خصم التجديد الشهري (10%-25%)</option>
                <option value="milestone_discount">خصم الإنجاز (50%)</option>
              </select>

              <select
                value={rewardStatusFilter}
                onChange={(e) => setRewardStatusFilter(e.target.value)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="available">متاح للاستخدام</option>
                <option value="redeemed">تم استخدامه</option>
                <option value="expired">منتهي الصلاحية</option>
              </select>
            </div>

            <button
              onClick={loadRewards}
              className="p-2.5 rounded-2xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
              title="تحديث الجدول"
            >
              <RefreshCw className={`w-4 h-4 ${loadingRewards ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Rewards Table */}
          {loadingRewards ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
              <span className="text-xs font-bold">جاري تحميل سجل المكافآت...</span>
            </div>
          ) : rewards.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm font-medium">
              لا توجد مكافآت مسجلة في هذا القسم.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="pb-3 pr-2">المستخدم</th>
                    <th className="pb-3">نوع المكافأة</th>
                    <th className="pb-3">نسبة الخصم</th>
                    <th className="pb-3">الحالة</th>
                    <th className="pb-3">تاريخ الإصدار</th>
                    <th className="pb-3">تاريخ الاستخدام / الفاتورة</th>
                    <th className="pb-3 pl-2">تاريخ الانتهاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rewards.map((rew) => (
                    <tr key={rew._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 pr-2 font-bold text-slate-800">
                        <div>{rew.userId?.name || "مستخدم"}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{rew.userId?.email}</div>
                      </td>
                      <td className="py-3.5 font-bold text-slate-700">
                        {rew.rewardType === "invitee_discount"
                          ? "خصم ترحيبي للمدعوين"
                          : rew.rewardType === "monthly_discount"
                          ? "خصم التجديد الشهري"
                          : rew.rewardType === "milestone_discount"
                          ? "خصم الإنجاز (50%)"
                          : "مكافأة يدوية"}
                      </td>
                      <td className="py-3.5 font-black text-indigo-600 text-sm">
                        {rew.discountPercent}%
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            rew.status === "available"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : rew.status === "redeemed"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {rew.status === "available"
                            ? "متاح للاستخدام"
                            : rew.status === "redeemed"
                            ? "تم الاستخدام"
                            : "منتهي"}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-500">
                        {new Date(rew.createdAt).toLocaleDateString("ar-EG-u-nu-latn")}
                      </td>
                      <td className="py-3.5 font-mono text-slate-600">
                        {rew.redeemedInvoiceNumber || (rew.redeemedAt ? new Date(rew.redeemedAt).toLocaleDateString("ar-EG-u-nu-latn") : "-")}
                      </td>
                      <td className="py-3.5 pl-2 text-slate-400">
                        {rew.expiresAt ? new Date(rew.expiresAt).toLocaleDateString("ar-EG-u-nu-latn") : "غير محدد"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {rewardsTotalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-bold text-slate-600">
              <span>
                صفحة {rewardsPage} من {rewardsTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={rewardsPage <= 1}
                  onClick={() => setRewardsPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  disabled={rewardsPage >= rewardsTotalPages}
                  onClick={() => setRewardsPage((p) => p + 1)}
                  className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 3: NFC FULFILLMENTS ──────────────── */}
      {activeTab === "nfc" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <select
              value={nfcStatusFilter}
              onChange={(e) => setNfcStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">جميع حالات الشحن</option>
              <option value="awaiting_details">بانتظار إدخال العنوان</option>
              <option value="approved">تم الاعتماد</option>
              <option value="preparing">جاري التجهيز والطباعة</option>
              <option value="shipped">تم الشحن</option>
              <option value="delivered">تم التسليم</option>
            </select>

            <button
              onClick={loadFulfillments}
              className="p-2.5 rounded-2xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingFulfillments ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loadingFulfillments ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-2" />
              <span className="text-xs font-bold">جاري تحميل طلبات شحن كروت NFC...</span>
            </div>
          ) : fulfillments.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm font-medium">
              لا توجد طلبات شحن كروت مجانية حالياً.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="pb-3 pr-2">المستخدم المستحق</th>
                    <th className="pb-3">بيانات المستلم والتوصيل</th>
                    <th className="pb-3">تخصيص الكارت</th>
                    <th className="pb-3">الحالة الحالية</th>
                    <th className="pb-3">شركة الشحن والتتبع</th>
                    <th className="pb-3 pl-2 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fulfillments.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 pr-2 font-bold text-slate-800">
                        <div>{item.userId?.name || "مستخدم"}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.userId?.email}</div>
                        <div className="text-[11px] text-indigo-600 font-mono mt-0.5">{item.userId?.referralCode}</div>
                      </td>
                      <td className="py-3.5 text-slate-700">
                        <div className="font-bold">{item.shippingAddress?.fullName || "-"}</div>
                        <div className="text-[11px] text-slate-500">{item.shippingAddress?.phone}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {item.shippingAddress?.city} - {item.shippingAddress?.address}
                        </div>
                      </td>
                      <td className="py-3.5 font-bold text-slate-800">
                        <div>طباعة: {item.printName || "-"}</div>
                        <div className="text-[11px] text-slate-400">لون: {item.cardColor || "Matte Black"}</div>
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            item.status === "delivered"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : item.status === "shipped"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : item.status === "preparing" || item.status === "approved"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Truck className="w-3 h-3" />
                          <span>
                            {item.status === "delivered"
                              ? "تم التسليم"
                              : item.status === "shipped"
                              ? "تم الشحن"
                              : item.status === "preparing"
                              ? "جاري التجهيز والطباعة"
                              : item.status === "approved"
                              ? "معتمد"
                              : "بانتظار العنوان"}
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 font-mono text-slate-700">
                        {item.trackingNumber ? (
                          <div>
                            <div className="font-bold">{item.carrier || "شركة شحن"}</div>
                            <div className="text-[11px] text-slate-500">{item.trackingNumber}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 pl-2 text-center">
                        <button
                          onClick={() => handleOpenNfcModal(item)}
                          className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors"
                        >
                          تحديث الحالة
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 4: SETTINGS ──────────────── */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 md:p-8">
          {loadingSettings || !settings ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
              <span className="text-xs font-bold">جاري تحميل إعدادات البرنامج...</span>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6 max-w-3xl">
              {settingsMessage && (
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                    settingsMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{settingsMessage.text}</span>
                </div>
              )}

              {/* Master Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">تفعيل برنامج الإحالات والمكافآت بالكامل</h4>
                  <p className="text-xs text-slate-500">تمكين احتساب الإحالات وتوليد الأكواد وإصدار المكافآت التلقائية</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {/* Invitee Discount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    نسبة خصم الصديق المدعو على أول اشتراك (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.inviteeDiscountPercent}
                    onChange={(e) => setSettings({ ...settings, inviteeDiscountPercent: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">القيمة الافتراضية الموصى بها: 10%</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    الحد الأقصى للخصم الشهري المكتسب (%)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={settings.maxMonthlyDiscountPercent}
                    onChange={(e) => setSettings({ ...settings, maxMonthlyDiscountPercent: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">الحد الأقصى لا يتجاوز 25% شهرياً</p>
                </div>
              </div>

              {/* Milestone Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    عدد الإحالات المطلوبة للمكافأة الكبرى (كارت NFC مجاني)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.milestoneReferralCount}
                    onChange={(e) => setSettings({ ...settings, milestoneReferralCount: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">العدد المستهدف مدى الحياة (افتراضي: 14 إحالة)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    نسبة خصم التجديد للمكافأة الكبرى (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.milestoneDiscountPercent}
                    onChange={(e) => setSettings({ ...settings, milestoneDiscountPercent: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">افتراضي: 50% على تجديد اشتراك واحد</p>
                </div>
              </div>

              {/* Monthly Tiers Configuration */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  مستويات الخصم الشهري (Monthly Tiers)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(settings.monthlyTiers || []).map((t, idx) => (
                    <div key={idx} className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-slate-500">المستوى {idx + 1}</span>
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                        <span>إحالات:</span>
                        <input
                          type="number"
                          min="1"
                          value={t.count}
                          onChange={(e) => {
                            const newTiers = [...settings.monthlyTiers];
                            newTiers[idx].count = Number(e.target.value);
                            setSettings({ ...settings, monthlyTiers: newTiers });
                          }}
                          className="w-12 px-2 py-1 rounded-lg border border-slate-200 text-center font-bold"
                        />
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-indigo-600">
                        <span>خصم %:</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={t.discountPercent}
                          onChange={(e) => {
                            const newTiers = [...settings.monthlyTiers];
                            newTiers[idx].discountPercent = Number(e.target.value);
                            setSettings({ ...settings, monthlyTiers: newTiers });
                          }}
                          className="w-12 px-2 py-1 rounded-lg border border-slate-200 text-center font-bold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stacking Rule */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">السماح بدمج خصومات الإحالة مع الكوبونات الترويجية</h4>
                  <p className="text-xs text-slate-500">إذا تم إلغاؤها، يختار النظام الخصم الأكبر فقط دون دمجهما معاً</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowStackingDiscounts}
                  onChange={(e) => setSettings({ ...settings, allowStackingDiscounts: e.target.checked })}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ إعدادات البرنامج</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Manual Reward Modal */}
      {showManualRewardModal && (
        <Modal
          title="منح مكافأة إحالة يدوية لمستخدم"
          onClose={() => setShowManualRewardModal(false)}
        >
          <form onSubmit={handleCreateManualRewardSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                معرف المستخدم (MongoDB ID) *
              </label>
              <input
                type="text"
                required
                value={manualRewardForm.userId}
                onChange={(e) => setManualRewardForm({ ...manualRewardForm, userId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                placeholder="60c72b2f9b1d8b2bad7... أو ابحث من جدول المستخدمين"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نسبة الخصم (%) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={manualRewardForm.discountPercent}
                  onChange={(e) =>
                    setManualRewardForm({ ...manualRewardForm, discountPercent: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الصلاحية (أيام)
                </label>
                <input
                  type="number"
                  min="1"
                  value={manualRewardForm.validityDays}
                  onChange={(e) =>
                    setManualRewardForm({ ...manualRewardForm, validityDays: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                نوع المكافأة
              </label>
              <select
                value={manualRewardForm.rewardType}
                onChange={(e) => setManualRewardForm({ ...manualRewardForm, rewardType: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
              >
                <option value="monthly_discount">خصم شهري لتجديد الاشتراك</option>
                <option value="milestone_discount">خصم إنجاز 50%</option>
                <option value="invitee_discount">خصم دعوة أصدقاء</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                سبب المنح / ملاحظات
              </label>
              <textarea
                rows={2}
                value={manualRewardForm.reason}
                onChange={(e) => setManualRewardForm({ ...manualRewardForm, reason: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                placeholder="مثال: تعويض عن عطل، ترقية خاصة، مشاركة في حملة ترويجية..."
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowManualRewardModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submittingReward}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {submittingReward ? "جاري الإصدار..." : "إصدار المكافأة"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* NFC Status Update Modal */}
      {selectedFulfillment && (
        <Modal
          title="تحديث حالة شحن كارت NFC المجاني"
          onClose={() => setSelectedFulfillment(null)}
        >
          <form onSubmit={handleUpdateNfcSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                حالة الشحن والتجهيز
              </label>
              <select
                value={nfcUpdateForm.status}
                onChange={(e) => setNfcUpdateForm({ ...nfcUpdateForm, status: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
              >
                <option value="awaiting_details">بانتظار إدخال العنوان</option>
                <option value="approved">تم الاعتماد والموافقة</option>
                <option value="preparing">جاري التجهيز والطباعة بالمصنع</option>
                <option value="shipped">تم تسليم الشحنة لشركة التوصيل (تم الشحن)</option>
                <option value="delivered">تم التسليم للعميل بنجاح</option>
                <option value="cancelled">ملغي / مرفوض</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  شركة الشحن / المندوب
                </label>
                <input
                  type="text"
                  value={nfcUpdateForm.carrier}
                  onChange={(e) => setNfcUpdateForm({ ...nfcUpdateForm, carrier: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  placeholder="Bosta, Aramex, مندوب..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رقم البوليصة / الشحنة (Tracking #)
                </label>
                <input
                  type="text"
                  value={nfcUpdateForm.trackingNumber}
                  onChange={(e) => setNfcUpdateForm({ ...nfcUpdateForm, trackingNumber: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  placeholder="TRK-98234..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ملاحظات الإدارة
              </label>
              <textarea
                rows={2}
                value={nfcUpdateForm.adminNotes}
                onChange={(e) => setNfcUpdateForm({ ...nfcUpdateForm, adminNotes: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                placeholder="ملاحظات داخلية لفريق العمل..."
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedFulfillment(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={updatingNfc}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {updatingNfc ? "جاري الحفظ..." : "حفظ التحديثات"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

