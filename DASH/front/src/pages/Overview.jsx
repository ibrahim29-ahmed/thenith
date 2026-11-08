import { Users, CreditCard, Activity, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchStats } from "../services/adminApi.js";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Overview() {
  const [data, setData] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalCards: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      title: "إجمالي المستخدمين",
      value: data.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "الاشتراكات النشطة (Pro)",
      value: data.activeSubscriptions,
      icon: CreditCard,
      color: "text-indigo-600",
      bg: "bg-indigo-100",
    },
    {
      title: "الإيرادات",
      value: `$${data.revenue}`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      title: "إجمالي البطاقات",
      value: data.totalCards,
      icon: Activity,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
  ];

  if (loading)
    return (
      <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
    );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-600">
            إدارة المنصة
          </p>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          نظرة عامة على المنصة
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            ملخص المستخدمين والاشتراكات والإيرادات والبطاقات.
          </p>
        </div>
        <p className="text-xs font-medium text-slate-500">
          {new Intl.DateTimeFormat("ar-EG", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date())}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="flex min-h-28 items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.025] transition-shadow hover:shadow-md"
            >
              <div className="min-w-0">
                <p className="mb-2 text-xs font-semibold text-slate-500">
                  {stat.title}
                </p>
                <h3 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {stat.value}
                </h3>
              </div>
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}
              >
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5">
        <div className="min-h-[390px] rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 sm:text-lg">
                مصادر المستخدمين
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                توزيع التسجيلات حسب مصدر الإحالة
              </p>
            </div>
            <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              Referrals
            </span>
          </div>
          {!data.referrers || data.referrers.length === 0 ? (
            <div className="flex min-h-[270px] flex-col items-center justify-center text-center text-slate-500">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                <Activity className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">لا توجد بيانات كافية للرسم البياني</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                ستظهر مصادر التسجيل هنا عند توفر بيانات الإحالة.
              </p>
            </div>
          ) : (
            <div className="h-[290px] w-full sm:h-[330px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.referrers}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="name"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {data.referrers.map((entry, index) => {
                      const COLORS = [
                        "#6366f1",
                        "#10b981",
                        "#f59e0b",
                        "#f43f5e",
                        "#8b5cf6",
                      ];
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} مستخدم`, name]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
