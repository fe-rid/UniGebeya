import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Package, Loader2, Star, CheckCircle2, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  total_amount: number;
  delivery_fee: number;
  status: string;
  created_at: string;
  runner_id: string | null;
  runner_rating: number | null;
  runner_review: string | null;
  shop_id: string | null;
  shop: {
    name: string;
  };
  order_items: OrderItem[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning',
  accepted: 'bg-primary/10 text-primary',
  preparing: 'bg-accent/10 text-accent',
  ready: 'bg-success/10 text-success',
  picked_up: 'bg-runner/10 text-runner',
  on_the_way: 'bg-runner/10 text-runner',
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready for Pickup',
  picked_up: 'Picked Up',
  on_the_way: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function StudentOrders() {
  const queryClient = useQueryClient();
  const { addItem, clearCart } = useCart();
  const navigate = useNavigate();

  // Fetch student orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['student-orders'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          delivery_fee,
          status,
          created_at,
          runner_id,
          runner_rating,
          runner_review,
          shop_id,
          shop:shops(name),
          order_items(id, product_name, quantity, unit_price)
        `)
        .eq('customer_id', session.session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Order[];
    },
  });

  const rateMutation = useMutation({
    mutationFn: async ({ orderId, rating, review }: { orderId: string; rating: number; review: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ runner_rating: rating, runner_review: review || null })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Thanks for your feedback!');
      queryClient.invalidateQueries({ queryKey: ['student-orders'] });
    },
    onError: () => toast.error('Failed to submit rating'),
  });

  // Real-time subscription for order updates
  useEffect(() => {
    const setupRealtime = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const channel = supabase
        .channel('student-orders-realtime')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `customer_id=eq.${session.session.user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['student-orders'] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtime();
  }, [queryClient]);

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const pastOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  const handleReorder = (order: Order) => {
    clearCart();
    order.order_items?.forEach(item => {
      addItem({
        id: item.id,
        shopId: order.shop_id || '',
        name: item.product_name,
        description: '',
        price: item.unit_price,
        category: '',
        image: '',
        isAvailable: true,
      });
    });
    toast.success('Items added to cart!');
    navigate('/student/cart');
  };

  const getProgressWidth = (status: string) => {
    switch (status) {
      case 'pending': return '8%';
      case 'accepted': return '25%';
      case 'preparing': return '40%';
      case 'ready': return '55%';
      case 'picked_up': return '70%';
      case 'on_the_way': return '85%';
      case 'delivered': return '100%';
      default: return '5%';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header title="My Orders" />
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="My Orders" />

      <div className="px-4 py-4">
        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4">Active Orders</h2>
            <div className="space-y-4">
              {activeOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-2xl bg-card shadow-card"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold">{order.shop?.name || 'Unknown Shop'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || 'bg-muted'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>

                  <div className="space-y-2 pb-3 border-b mb-3">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.quantity}x {item.product_name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold">{Number(order.total_amount).toFixed(0)} ETB</span>
                    <span className="text-sm text-muted-foreground">
                      +{Number(order.delivery_fee).toFixed(0)} ETB delivery
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      {[
                        { label: 'Placed', statuses: ['pending'] },
                        { label: 'Preparing', statuses: ['accepted', 'preparing'] },
                        { label: 'Picked Up', statuses: ['ready', 'picked_up', 'on_the_way'] },
                        { label: 'Delivered', statuses: ['delivered'] },
                      ].map((step) => (
                        <span
                          key={step.label}
                          className={
                            step.statuses.includes(order.status)
                              ? 'text-primary font-semibold'
                              : 'text-muted-foreground'
                          }
                        >
                          {step.label}
                        </span>
                      ))}
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: getProgressWidth(order.status) }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="h-full gradient-primary rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Past Orders */}
        <section>
          <h2 className="text-lg font-bold mb-4">Past Orders</h2>
          {pastOrders.length > 0 ? (
            <div className="space-y-4">
              {pastOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-2xl bg-card shadow-card"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold">{order.shop?.name || 'Unknown Shop'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || 'bg-muted'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-muted-foreground">
                      {order.order_items?.length || 0} items
                    </span>
                    <span className="font-bold">{Number(order.total_amount).toFixed(0)} ETB</span>
                  </div>

                  {order.status === 'delivered' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 gap-2"
                      onClick={() => handleReorder(order)}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reorder
                    </Button>
                  )}

                  {order.status === 'delivered' && order.runner_id && (
                    <RatingBlock
                      order={order}
                      onSubmitRunner={(rating, review) =>
                        rateMutation.mutate({ orderId: order.id, rating, review })
                      }
                      isSubmitting={rateMutation.isPending}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No past orders yet</p>
            </div>
          )}
        </section>

        {/* Empty State */}
        {orders.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">No orders yet</h3>
            <p className="text-muted-foreground">
              Your order history will appear here
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function RatingBlock({
  order,
  onSubmitRunner,
  isSubmitting,
}: {
  order: Order;
  onSubmitRunner: (rating: number, review: string) => void;
  isSubmitting: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');

  // Shop rating stored in localStorage
  const shopRatingKey = `shop_rating_${order.id}`;
  const savedShopRating = localStorage.getItem(shopRatingKey);
  const parsedShopRating = savedShopRating ? JSON.parse(savedShopRating) as { rating: number; review: string } : null;

  const [shopRating, setShopRating] = useState(0);
  const [shopHover, setShopHover] = useState(0);
  const [shopReview, setShopReview] = useState('');

  const handleShopRatingSubmit = () => {
    localStorage.setItem(shopRatingKey, JSON.stringify({ rating: shopRating, review: shopReview }));
    toast.success('Shop rating saved!');
    // Force re-render by updating state indirectly — component will re-read localStorage on next render
    setShopRating(0);
    setShopReview('');
  };

  const runnerRatingSection = order.runner_rating ? (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 className="w-4 h-4 text-success" />
        <span className="text-sm font-medium">Delivery confirmed</span>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`w-4 h-4 ${n <= (order.runner_rating || 0) ? 'fill-warning text-warning' : 'text-muted-foreground'}`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-2">You rated the runner</span>
      </div>
      {order.runner_review && (
        <p className="text-sm text-muted-foreground mt-2 italic">"{order.runner_review}"</p>
      )}
    </div>
  ) : (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-4 h-4 text-success" />
        <p className="text-sm font-semibold">Order delivered — rate your runner</p>
      </div>
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="p-1"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                n <= (hover || rating) ? 'fill-warning text-warning' : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Leave a comment (optional)"
        value={review}
        onChange={(e) => setReview(e.target.value)}
        className="mb-3 text-sm"
        rows={2}
      />
      <Button
        className="w-full"
        disabled={rating === 0 || isSubmitting}
        onClick={() => onSubmitRunner(rating, review)}
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Runner Rating'}
      </Button>
    </div>
  );

  const shopRatingSection = parsedShopRating ? (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 className="w-4 h-4 text-success" />
        <span className="text-sm font-medium">Shop rated</span>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`w-4 h-4 ${n <= parsedShopRating.rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-2">You rated the shop</span>
      </div>
      {parsedShopRating.review && (
        <p className="text-sm text-muted-foreground mt-2 italic">"{parsedShopRating.review}"</p>
      )}
    </div>
  ) : (
    <div>
      <p className="text-sm font-semibold mb-2">Rate the Shop</p>
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setShopHover(n)}
            onMouseLeave={() => setShopHover(0)}
            onClick={() => setShopRating(n)}
            className="p-1"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                n <= (shopHover || shopRating) ? 'fill-warning text-warning' : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Leave a shop review (optional)"
        value={shopReview}
        onChange={(e) => setShopReview(e.target.value)}
        className="mb-3 text-sm"
        rows={2}
      />
      <Button
        className="w-full"
        disabled={shopRating === 0}
        onClick={handleShopRatingSubmit}
      >
        Submit Shop Rating
      </Button>
    </div>
  );

  return (
    <div className="mt-3 pt-3 border-t space-y-4">
      {runnerRatingSection}
      {shopRatingSection}
    </div>
  );
}
