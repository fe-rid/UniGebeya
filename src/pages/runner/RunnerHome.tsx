import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, MapPin, DollarSign, Clock, CheckCircle, Loader2, Star } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Order {
  id: string;
  total_amount: number;
  delivery_fee: number;
  delivery_address: string | null;
  status: string;
  created_at: string;
  shop: {
    id: string;
    name: string;
    location: string | null;
  };
  order_items: {
    id: string;
    product_name: string;
    quantity: number;
  }[];
}

export default function RunnerHome() {
  const { user, updateUser } = useAuth();
  const [isOnline, setIsOnline] = useState(user?.isOnline ?? true);
  const queryClient = useQueryClient();

  // Fetch available orders (accepted by shop, no runner assigned)
  const { data: availableOrders = [], isLoading } = useQuery({
    queryKey: ['available-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          delivery_fee,
          delivery_address,
          status,
          created_at,
          shop:shops(id, name, location),
          order_items(id, product_name, quantity)
        `)
        .eq('status', 'accepted')
        .is('runner_id', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as Order[];
    },
    enabled: isOnline,
  });

  // Real-time subscription for new orders
  useEffect(() => {
    if (!isOnline) return;

    const channel = supabase
      .channel('runner-available-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['available-orders'] });
          // Show toast for new orders
          if (payload.eventType === 'UPDATE' && payload.new.status === 'accepted' && !payload.new.runner_id) {
            toast.info('New delivery available!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOnline, queryClient]);

  // Fetch runner overall stats
  const { data: overallStats } = useQuery({
    queryKey: ['runner-overall-stats', user?.id],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return { deliveries: 0, earned: 0, rating: 0.0 };

      const { data: orders, error } = await supabase
        .from('orders')
        .select('delivery_fee, runner_rating')
        .eq('runner_id', session.session.user.id)
        .eq('status', 'delivered');

      if (error) return { deliveries: 0, earned: 0, rating: 0.0 };

      const deliveries = orders?.length || 0;
      const earned = orders?.reduce((sum, o) => sum + Number(o.delivery_fee), 0) || 0;
      const ratedOrders = orders?.filter(o => o.runner_rating !== null) || [];
      const rating = ratedOrders.length > 0
        ? Number((ratedOrders.reduce((sum, o) => sum + Number(o.runner_rating), 0) / ratedOrders.length).toFixed(1))
        : 0.0;

      return { deliveries, earned, rating };
    },
    enabled: !!user?.id,
  });

  // Accept order mutation
  const acceptMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('orders')
        .update({ 
          runner_id: session.session.user.id,
          status: 'picked_up'
        })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Order accepted! Head to the shop for pickup.');
      queryClient.invalidateQueries({ queryKey: ['available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['runner-active-orders'] });
    },
    onError: (error) => {
      toast.error('Failed to accept order');
      console.error(error);
    },
  });

  const toggleOnline = () => {
    setIsOnline(!isOnline);
    updateUser({ isOnline: !isOnline });
    toast.success(isOnline ? 'You are now offline' : 'You are now online');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Available Deliveries" showNotification />

      <div className="px-4 py-4">
        {/* Status Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl mb-6 ${isOnline ? 'gradient-runner' : 'bg-muted'}`}
        >
          <div className="flex items-center justify-between">
            <div className={isOnline ? 'text-white' : ''}>
              <h2 className="font-bold text-lg">{isOnline ? "You're Online" : "You're Offline"}</h2>
              <p className={`text-sm ${isOnline ? 'opacity-80' : 'text-muted-foreground'}`}>
                {isOnline ? 'Receiving delivery requests' : 'Toggle to start receiving orders'}
              </p>
            </div>
            <Switch checked={isOnline} onCheckedChange={toggleOnline} />
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          {[
            { icon: Package, label: 'Deliveries', value: String(overallStats?.deliveries || 0), iconColor: 'text-primary' },
            { icon: DollarSign, label: 'Total Earned', value: `${overallStats?.earned || 0} ETB`, iconColor: 'text-success' },
            { icon: Star, label: 'Avg Rating', value: overallStats && overallStats.rating > 0 ? `${overallStats.rating.toFixed(1)} ★` : '0.0 ★', iconColor: 'text-warning' },
            { icon: Clock, label: 'Available Jobs', value: String(availableOrders.length), iconColor: 'text-info' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="p-4 rounded-2xl bg-card shadow-card text-center">
                <Icon className={`w-5 h-5 mx-auto mb-2 ${stat.iconColor}`} />
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </motion.div>

        {/* Available Orders */}
        <h2 className="text-lg font-bold mb-4">Available Orders</h2>
        {isOnline ? (
          isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : availableOrders.length > 0 ? (
            <div className="space-y-4">
              {availableOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-2xl bg-card shadow-card"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold">{order.shop?.name || 'Unknown Shop'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {order.shop?.location || 'Location not set'}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-success">{order.delivery_fee} ETB</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    <p>📍 Drop: {order.delivery_address || 'Address not set'}</p>
                    <p>📦 {order.order_items?.length || 0} items</p>
                  </div>
                  <Button 
                    variant="runner" 
                    className="w-full"
                    onClick={() => acceptMutation.mutate(order.id)}
                    disabled={acceptMutation.isPending}
                  >
                    {acceptMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" /> Accept Delivery
                      </>
                    )}
                  </Button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No deliveries available right now</p>
            </div>
          )
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Go online to see available deliveries</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
