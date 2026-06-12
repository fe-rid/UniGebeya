import { motion } from 'framer-motion';
import { Package, MapPin, Loader2, Phone } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ActiveOrder {
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

export default function RunnerActive() {
  const queryClient = useQueryClient();

  // Fetch active orders assigned to this runner
  const { data: activeOrders = [], isLoading } = useQuery({
    queryKey: ['runner-active-orders'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return [];

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
        .eq('runner_id', session.session.user.id)
        .in('status', ['picked_up', 'on_the_way'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as ActiveOrder[];
    },
    refetchInterval: 10000,
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: (_, { newStatus }) => {
      const message = newStatus === 'on_the_way' 
        ? 'Order picked up! Head to the customer.' 
        : 'Order delivered successfully!';
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['runner-active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['runner-earnings'] });
      queryClient.invalidateQueries({ queryKey: ['runner-overall-stats'] });
      queryClient.invalidateQueries({ queryKey: ['runner-profile-stats'] });
    },
    onError: () => {
      toast.error('Failed to update order status');
    },
  });

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'picked_up':
        return 'bg-warning/10 text-warning';
      case 'on_the_way':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'picked_up':
        return 'Ready for Pickup';
      case 'on_the_way':
        return 'On the Way';
      default:
        return status;
    }
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case 'picked_up':
        return { label: 'Start Delivery', nextStatus: 'on_the_way' };
      case 'on_the_way':
        return { label: 'Mark as Delivered', nextStatus: 'delivered' };
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Active Deliveries" showNotification />

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Active Deliveries</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Accept orders from the Deliveries tab to get started
            </p>
            <Button variant="runner" onClick={() => window.location.href = '/runner'}>
              View Available Orders
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {activeOrders.map((order, index) => {
              const nextAction = getNextAction(order.status);
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-3">
                    <p>📍 Drop: {order.delivery_address || 'Address not set'}</p>
                    <p>📦 {order.order_items?.length || 0} items</p>
                    <p>💰 Earning: {order.delivery_fee} ETB</p>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-3 mb-3">
                    <p className="text-xs font-medium mb-1">Order Items:</p>
                    {order.order_items?.map((item) => (
                      <p key={item.id} className="text-xs text-muted-foreground">
                        • {item.quantity}x {item.product_name}
                      </p>
                    ))}
                  </div>
                  
                  {nextAction && (
                    <Button 
                      variant="runner" 
                      className="w-full"
                      onClick={() => updateStatusMutation.mutate({ 
                        orderId: order.id, 
                        newStatus: nextAction.nextStatus 
                      })}
                      disabled={updateStatusMutation.isPending}
                    >
                      {updateStatusMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        nextAction.label
                      )}
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
