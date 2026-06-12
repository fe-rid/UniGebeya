import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, TrendingUp, Clock, Plus, ShoppingBag, ListOrdered, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  order_items: { id: string; product_name: string; quantity: number }[];
}

interface Shop {
  id: string;
  name: string;
  is_open: boolean;
}

export default function ShopDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch shop data
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ['my-shop'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;

      const { data, error } = await supabase
        .from('shops')
        .select('id, name, is_open')
        .eq('user_id', session.session.user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Shop | null;
    },
  });

  // Fetch orders for this shop
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['shop-dashboard-orders', shop?.id],
    queryFn: async () => {
      if (!shop?.id) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          order_items(id, product_name, quantity)
        `)
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!shop?.id,
  });

  // Fetch product count
  const { data: productCount = 0 } = useQuery({
    queryKey: ['shop-product-count', shop?.id],
    queryFn: async () => {
      if (!shop?.id) return 0;

      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!shop?.id,
  });

  // Real-time subscription for new orders
  useEffect(() => {
    if (!shop?.id) return;

    const channel = supabase
      .channel('shop-dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['shop-dashboard-orders'] });
          if (payload.eventType === 'INSERT') {
            toast.info('New order received!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shop?.id, queryClient]);

  // Toggle shop open/closed
  const toggleOpenMutation = useMutation({
    mutationFn: async (isOpen: boolean) => {
      if (!shop?.id) throw new Error('No shop found');

      const { error } = await supabase
        .from('shops')
        .update({ is_open: isOpen })
        .eq('id', shop.id);

      if (error) throw error;
    },
    onSuccess: (_, isOpen) => {
      queryClient.invalidateQueries({ queryKey: ['my-shop'] });
      toast.success(isOpen ? 'Shop is now open' : 'Shop is now closed');
    },
    onError: () => {
      toast.error('Failed to update shop status');
    },
  });

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.created_at);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  });
  const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header title="Shop Dashboard" showNotification />
        <div className="px-4 py-12 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Set Up Your Shop</h2>
          <p className="text-muted-foreground mb-4">
            Please complete your shop profile to start receiving orders.
          </p>
          <Button variant="shop" onClick={() => navigate('/shop/profile')}>
            Go to Profile
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Shop Dashboard" showNotification />

      <div className="px-4 py-4">
        {/* Shop Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl mb-6 ${shop.is_open ? 'gradient-shop' : 'bg-muted'}`}
        >
          <div className="flex items-center justify-between">
            <div className={shop.is_open ? 'text-white' : ''}>
              <h2 className="font-bold text-lg">{shop.is_open ? 'Shop is Open' : 'Shop is Closed'}</h2>
              <p className={`text-sm ${shop.is_open ? 'opacity-80' : 'text-muted-foreground'}`}>
                {shop.is_open ? 'Accepting orders' : 'Not accepting orders'}
              </p>
            </div>
            <Switch 
              checked={shop.is_open} 
              onCheckedChange={(checked) => toggleOpenMutation.mutate(checked)}
              disabled={toggleOpenMutation.isPending}
            />
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Package, label: 'Today', value: todayOrders.length.toString() },
            { icon: TrendingUp, label: 'Revenue', value: `${todayRevenue} ETB` },
            { icon: Clock, label: 'Pending', value: pendingOrders.length.toString() },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-2xl bg-card shadow-card text-center"
              >
                <Icon className="w-5 h-5 mx-auto mb-2 text-accent" />
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button 
            variant="shop" 
            className="h-auto py-4 flex-col gap-2"
            onClick={() => navigate('/shop/orders')}
          >
            <ListOrdered className="w-6 h-6" />
            <span>View Orders</span>
            {pendingOrders.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">
                {pendingOrders.length} pending
              </span>
            )}
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2"
            onClick={() => navigate('/shop/products')}
          >
            <Plus className="w-6 h-6" />
            <span>Manage Products</span>
            <span className="text-xs text-muted-foreground">{productCount} items</span>
          </Button>
        </div>

        {/* Recent Orders */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Recent Orders</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/shop/orders')}>
            View All
          </Button>
        </div>
        
        {ordersLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 3).map((order) => (
              <motion.div 
                key={order.id} 
                className="p-4 rounded-2xl bg-card shadow-card cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate('/shop/orders')}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Order #{order.id.slice(-6)}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.order_items?.length || 0} items • {Number(order.total_amount).toFixed(0)} ETB
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    order.status === 'pending' 
                      ? 'bg-warning/10 text-warning' 
                      : order.status === 'accepted'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-success/10 text-success'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </motion.div>
            ))}

            {orders.length === 0 && (
              <div className="text-center py-8">
                <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No orders yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
