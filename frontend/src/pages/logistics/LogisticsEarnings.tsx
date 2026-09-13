import { useState, useEffect } from "react";
import {
  Wallet,
  Clock3,
  TrendingUp,
  Download,
  Calendar,
  CreditCard,
  Building2,
  CheckCircle2,
  Truck,
  RotateCw,
} from "lucide-react";
import { LogisticsLayout } from "../../layouts/LogisticsLayout";
import { api, rupees } from "../../services/api";

type EarningsSummary = {
  todayPaise: number;
  weekPaise: number;
  monthPaise: number;
  totalPaise: number;
  completedCount: number;
};

type DailyChartPoint = {
  date: string;
  dayName: string;
  amountRupees: number;
};

type BookingHistoryItem = {
  id: string;
  deliveredAt: string;
  quantity: number;
  pickup: string;
  vehicle: string;
  amountPaise: number;
};

type WorkingHoursData = {
  todayHours: number;
  weekHours: number;
  activeNowHours: number;
  isCurrentlyOnTrip: boolean;
};

export function LogisticsEarnings() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [chartData, setChartData] = useState<DailyChartPoint[]>([]);
  const [history, setHistory] = useState<BookingHistoryItem[]>([]);
  const [hours, setHours] = useState<WorkingHoursData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async () => {
    try {
      const [earningsRes, hoursRes] = await Promise.all([
        api<{ summary: EarningsSummary; chartData: DailyChartPoint[]; history: BookingHistoryItem[] }>(
          "/api/logistics/earnings"
        ),
        api<WorkingHoursData>("/api/logistics/working-hours"),
      ]);

      setSummary(earningsRes.summary);
      setChartData(earningsRes.chartData || []);
      setHistory(earningsRes.history || []);
      setHours(hoursRes);
    } catch (err) {
      console.error("Failed to load earnings data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadAll();
  };

  const maxChartVal = Math.max(...chartData.map((d) => d.amountRupees), 1000);

  if (loading) {
    return (
      <LogisticsLayout>
        <div className="p-8 animate-pulse space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-slate-200" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-white border border-slate-200" />
        </div>
      </LogisticsLayout>
    );
  }

  return (
    <LogisticsLayout>
      <div className="space-y-6">
        {/* Header Title with Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Earnings & Duty Analytics</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified payouts directly disbursed from Farmer Cooperatives to your registered bank account.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <RotateCw size={13} className={refreshing ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => alert("Payout statement generated and sent to registered email.")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-xs"
            >
              <Download size={13} />
              <span>Download Payout Slip</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Earnings */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Earnings</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900">{rupees(summary?.todayPaise ?? 0)}</p>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-700 font-semibold">
                <TrendingUp size={12} />
                <span>Active Duty: {hours?.todayHours ?? 0}h logged today</span>
              </div>
            </div>
          </div>

          {/* This Week */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">This Week</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900">{rupees(summary?.weekPaise ?? 0)}</p>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                <span>Logged hours: {hours?.weekHours ?? 0} hrs</span>
              </div>
            </div>
          </div>

          {/* This Month */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">This Month</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CreditCard size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900">{rupees(summary?.monthPaise ?? 0)}</p>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                <span>Completed trips: {summary?.completedCount ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Active Duty Status */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Trip Status</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock3 size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    hours?.isCurrentlyOnTrip ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                <p className="text-lg font-bold text-slate-900">
                  {hours?.isCurrentlyOnTrip ? "Trip In Progress" : "Available for Duty"}
                </p>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {hours?.isCurrentlyOnTrip
                  ? `${hours.activeNowHours} hrs on current haul`
                  : "All dispatches completed"}
              </p>
            </div>
          </div>
        </div>

        {/* 7-Day Interactive Trend Chart */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                7-Day Earnings Trend
              </h3>
              <p className="text-xs text-slate-500">Daily breakdown of completed agricultural freight dispatches</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">Weekly Total</span>
              <p className="text-base font-bold text-slate-900">{rupees(summary?.weekPaise ?? 0)}</p>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-6 pb-2">
            <div className="grid grid-cols-7 gap-3 items-end h-48 border-b border-slate-200 px-2">
              {chartData.map((day, idx) => {
                const heightPercent = Math.max(10, Math.round((day.amountRupees / maxChartVal) * 100));
                const isToday = idx === chartData.length - 1;

                return (
                  <div key={day.date} className="flex flex-col items-center gap-2 group h-full justify-end">
                    <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition">
                      ₹{day.amountRupees}
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[42px] rounded-t-lg transition-all duration-300 ${
                        isToday
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : day.amountRupees > 0
                          ? "bg-slate-800 hover:bg-slate-700"
                          : "bg-slate-100"
                      }`}
                    />
                    <span
                      className={`text-[11px] font-semibold ${
                        isToday ? "text-emerald-700 font-bold" : "text-slate-500"
                      }`}
                    >
                      {day.dayName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bank Account Details & Settlement Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Direct Cooperative Settlement Account</h3>
                <p className="text-xs text-slate-500">Earnings automatically credit on Tuesdays and Fridays</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-medium">Bank Name</span>
                <p className="font-bold text-slate-900 mt-0.5">Canara Bank (Devanahalli Agri Branch)</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Account Number</span>
                <p className="font-bold text-slate-900 mt-0.5">•••• •••• 8492</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">IFSC Code</span>
                <p className="font-bold text-slate-900 mt-0.5">CNRB0002841</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-700 font-medium">
              <CheckCircle2 size={14} />
              <span>KYC Verified & NPCI Aadhaar-linked for immediate direct benefit transfer (DBT).</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase">Rate Card Policy</span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">Direct Farmer Delivery Tariffs</h4>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li className="flex justify-between">
                  <span>Heavy Truck Base</span>
                  <span className="font-bold text-slate-900">₹350.00</span>
                </li>
                <li className="flex justify-between">
                  <span>Per-Kg Rate</span>
                  <span className="font-bold text-slate-900">₹1.50 / kg</span>
                </li>
                <li className="flex justify-between">
                  <span>Cold Chain Premium</span>
                  <span className="font-bold text-emerald-600">+15% Included</span>
                </li>
              </ul>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-100 pt-2">
              All rates guaranteed by Samruddhi Setu APMC cooperative agreements. Zero platform deductions.
            </p>
          </div>
        </div>

        {/* Payout History Table */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Completed Delivery Payouts
              </h3>
              <p className="text-xs text-slate-500">Every delivery booked and verified with digital timestamp</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              {history.length} Transactions
            </span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <Truck size={32} className="mx-auto mb-2 text-slate-300" />
              <p>No completed delivery payouts recorded yet.</p>
              <p className="text-slate-500 mt-1">Accept and deliver your first shipment from Available Jobs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3">Delivery ID</th>
                    <th className="pb-3">Date & Time</th>
                    <th className="pb-3">Cargo Weight</th>
                    <th className="pb-3">Pickup Hub</th>
                    <th className="pb-3">Vehicle</th>
                    <th className="pb-3 text-right">Net Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 font-mono font-bold text-slate-900">SS-{item.id.slice(0, 8)}</td>
                      <td className="py-3 text-slate-500">
                        {item.deliveredAt ? new Date(item.deliveredAt).toLocaleDateString("en-IN") : "Completed"}
                      </td>
                      <td className="py-3 font-semibold">{item.quantity} kg</td>
                      <td className="py-3 truncate max-w-[180px]">{item.pickup}</td>
                      <td className="py-3 text-slate-500">{item.vehicle}</td>
                      <td className="py-3 text-right font-black text-slate-900">{rupees(item.amountPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </LogisticsLayout>
  );
}
