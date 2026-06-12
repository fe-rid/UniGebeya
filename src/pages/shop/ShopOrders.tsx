import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Package, XCircle, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  customer_id: string;
  total_amount: number;
  delivery_fee: number;
  status: string;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
  order_items: OrderItem[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning',
  accepted: 'bg-primary/10 text-primary',
  picked_up: 'bg-runner/10 text-runner',
  on_the_way: 'bg-runner/10 text-runner',
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

export default function ShopOrders() {
  const queryClient = useQueryClient();

  // Fetch shop orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['shop-orders'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return [];

      // First get the shop for this user
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('user_id', session.session.user.id)
        .maybeSingle();

      if (!shop) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          customer_id,
          total_amount,
          delivery_fee,
          status,
          delivery_address,
          notes,
          created_at,
          order_items(id, product_name, quantity, unit_price)
        `)
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
  });

  // Real-time subscription for order updates
  useEffect(() => {
    const channel = supabase
      .channel('shop-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shop-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
      toast.success(`Order ${newStatus.replace('_', ' ')}`);
      queryClient.invalidateQueries({ queryKey: ['shop-orders'] });
    },
    onError: () => {
      toast.error('Failed to update order');
    },
  });

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeOrders = orders.filter(o => ['accepted'].includes(o.status));
  const completedOrders = orders.filter(o => ['picked_up', 'on_the_way', 'delivered', 'cancelled'].includes(o.status));

  const OrderCard = ({ order }: { order: Order }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-card shadow-card"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-bold">Order #{order.id.slice(-6)}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || 'bg-muted'}`}>
          {order.status.replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-1 mb-3">
        {order.order_items?.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>{item.quantity}x {item.product_name}</span>
            <span className="text-muted-foreground">{(item.unit_price * item.quantity).toFixed(0)} ETB</span>
          </div>
        ))}
      </div>

      {order.notes && (
        <p className="text-sm text-muted-foreground italic mb-3">Note: {order.notes}</p>
      )}

      <div className="flex justify-between items-center pt-3 border-t">
        <p className="font-bold">Total: {Number(order.total_amount).toFixed(0)} ETB</p>

        {order.status === 'pending' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'cancelled' })}
              disabled={updateStatusMutation.isPending}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button
              variant="shop"
              size="sm"
              onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'accepted' })}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Accept
                </>
              )}
            </Button>
          </div>
        )}

        {order.status === 'accepted' && (
          <span className="text-sm text-muted-foreground">Waiting for runner...</span>
        )}
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header title="Orders" showBack />
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Orders" showBack />

      <div className="px-4 py-4">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-warning text-white text-xs flex items-center justify-center">
                  {pendingOrders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending orders</p>
              </div>
            ) : (
              pendingOrders.map(order => <OrderCard key={order.id} order={order} />)
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-3">
            {activeOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active orders</p>
              </div>
            ) : (
              activeOrders.map(order => <OrderCard key={order.id} order={order} />)
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3">
            {completedOrders.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No completed orders yet</p>
              </div>
            ) : (
              completedOrders.map(order => <OrderCard key={order.id} order={order} />)
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
