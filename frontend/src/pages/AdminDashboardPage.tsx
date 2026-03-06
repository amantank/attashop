import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Package, TrendingUp, Clock, CheckCircle, ShoppingBag, Wheat } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getAnalytics } from '../api/analytics';
import { Loader, ErrorMessage } from '../components/Loader';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

function StatCard({ icon, label, value, sub, color = 'amber' }: StatCardProps) {
  const bg: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg[color]}`}>
          {icon}
        </div>
        <p className="text-sm text-stone-500 font-medium">{label}</p>
      </div>
      <p className="text-2xl font-extrabold text-stone-900">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { t } = useLanguage();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalytics,
    refetchInterval: 60_000,
  });

  if (isLoading) return <Loader text="Loading analytics…" />;
  if (isError || !data?.analytics) return <ErrorMessage message={t('error')} onRetry={() => refetch()} />;

  const a = data.analytics;

  const chartData = a.topProducts.map(p => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
    quantity: p.quantity,
    revenue: p.revenue,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
          <Wheat size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">{t('adminDashboard')}</h1>
          <p className="text-xs text-stone-400">Live analytics · auto-refreshes every 60s</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          icon={<ShoppingBag size={20} />}
          label={t('todayOrders')}
          value={a.today.orders}
          color="amber"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label={t('todayRevenue')}
          value={`₹${a.today.revenue.toLocaleString('en-IN')}`}
          color="green"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label={t('weekRevenue')}
          value={`₹${a.week.revenue.toLocaleString('en-IN')}`}
          sub={`${a.week.orders} orders`}
          color="blue"
        />
        <StatCard
          icon={<Clock size={20} />}
          label={t('pendingOrders')}
          value={a.pendingOrders}
          color="orange"
        />
        <StatCard
          icon={<CheckCircle size={20} />}
          label={t('completedOrders')}
          value={a.completedOrders}
          sub={`Total: ${a.totalOrders}`}
          color="green"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Top Products by quantity */}
        <div className="card p-5">
          <h2 className="font-bold text-stone-800 mb-4 text-sm">{t('topProducts')} – Quantity</h2>
          {chartData.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: number) => [val, 'Units']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #f0f0f0', fontSize: 12 }}
                />
                <Bar dataKey="quantity" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Products by revenue */}
        <div className="card p-5">
          <h2 className="font-bold text-stone-800 mb-4 text-sm">{t('topProducts')} – Revenue</h2>
          {chartData.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${v}`} />
                <Tooltip
                  formatter={(val: number) => [`₹${val}`, 'Revenue']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #f0f0f0', fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top products table */}
      <div className="card p-5">
        <h2 className="font-bold text-stone-800 mb-4">{t('topProducts')}</h2>
        {a.topProducts.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-6">No orders yet. Add products via the Admin Telegram Bot.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-stone-100">
                  <th className="pb-2 font-bold text-stone-500 w-8">#</th>
                  <th className="pb-2 font-bold text-stone-500">Product</th>
                  <th className="pb-2 font-bold text-stone-500 text-right">Units Sold</th>
                  <th className="pb-2 font-bold text-stone-500 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {a.topProducts.map((p, i) => (
                  <tr key={p.productId} className="border-b border-stone-50 hover:bg-stone-50 transition">
                    <td className="py-3 text-stone-400 font-bold">{i + 1}</td>
                    <td className="py-3 font-semibold text-stone-800">{p.name}</td>
                    <td className="py-3 text-right font-bold text-amber-600">{p.quantity}</td>
                    <td className="py-3 text-right font-bold text-green-600">₹{p.revenue.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
