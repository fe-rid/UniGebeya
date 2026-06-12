import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Wallet, Loader2, Package } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface DeliveredOrder {
  id: string;
  delivery_fee: number;
  created_at: string;
  shop: {
    name: string;
  };
}

export default function RunnerEarnings() {
  // Fetch earnings data
  const { data: earningsData, isLoading } = useQuery({
    queryKey: ['runner-earnings'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch all delivered orders for this runner
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          delivery_fee,
          created_at,
          shop:shops(name)
        `)
        .eq('runner_id', session.session.user.id)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allOrders = orders as unknown as DeliveredOrder[];

      // Calculate stats
      const today = allOrders.filter(o => new Date(o.created_at) >= todayStart);
      const thisWeek = allOrders.filter(o => new Date(o.created_at) >= weekStart);
      const thisMonth = allOrders.filter(o => new Date(o.created_at) >= monthStart);

      const todayEarnings = today.reduce((sum, o) => sum + Number(o.delivery_fee), 0);
      const weekEarnings = thisWeek.reduce((sum, o) => sum + Number(o.delivery_fee), 0);
      const monthEarnings = thisMonth.reduce((sum, o) => sum + Number(o.delivery_fee), 0);

      // Get recent orders (last 10)
      const recentOrders = allOrders.slice(0, 10).map(order => ({
        id: order.id,
        shop: order.shop?.name || 'Unknown Shop',
        amount: Number(order.delivery_fee),
        time: getRelativeTime(new Date(order.created_at)),
      }));

      return {
        today: todayEarnings,
        thisWeek: weekEarnings,
        thisMonth: monthEarnings,
        totalDeliveries: thisMonth.length,
        recentEarnings: recentOrders,
      };
    },
  });

  function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header title="Earnings" showNotification />
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  const earnings = earningsData || {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    totalDeliveries: 0,
    recentEarnings: [],
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Earnings" showNotification />

      <div className="px-4 py-4">
        {/* Total Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl gradient-runner text-white mb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5" />
            <span className="text-sm opacity-80">Total Earnings</span>
          </div>
          <p className="text-3xl font-bold">{earnings.thisMonth.toLocaleString()} ETB</p>
          <p className="text-sm opacity-80 mt-1">This month • {earnings.totalDeliveries} deliveries</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Today', value: `${earnings.today} ETB`, icon: DollarSign, color: 'text-success' },
            { label: 'This Week', value: `${earnings.thisWeek} ETB`, icon: TrendingUp, color: 'text-primary' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className="p-4 rounded-2xl bg-card shadow-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent Earnings */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Recent Earnings</h3>
          
          {earnings.recentEarnings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground"
            >
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No deliveries completed yet</p>
              <p className="text-sm">Start delivering to earn!</p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {earnings.recentEarnings.map((earning, index) => (
                <motion.div
                  key={earning.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-2xl bg-card shadow-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">{earning.shop}</p>
                      <p className="text-xs text-muted-foreground">{earning.time}</p>
                    </div>
                  </div>
                  <span className="font-bold text-success">+{earning.amount} ETB</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
