import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, MapPin, Loader2, Phone, Navigation, CheckCircle, 
  Check, CheckSquare, Square, ExternalLink, ChevronDown, ChevronUp,
  DollarSign, Info, AlertCircle, ShoppingBag
} from 'lucide-react';
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
  notes: string | null;
  customer_id: string;
  shop: {
    id: string;
    name: string;
    location: string | null;
    user_id: string;
  };
  order_items: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }[];
  customerName: string;
  customerPhone: string;
  shopPhone: string;
}

export default function RunnerActive() {
  const queryClient = useQueryClient();
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [arrivedOrders, setArrivedOrders] = useState<Record<string, boolean>>({});
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Fetch active orders assigned to this runner
  const { data: activeOrders = [], isLoading } = useQuery({
    queryKey: ['runner-active-orders'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          delivery_fee,
          delivery_address,
          status,
          created_at,
          notes,
          customer_id,
          shop:shops(id, name, location, user_id),
          order_items(id, product_name, quantity, unit_price)
        `)
        .eq('runner_id', session.session.user.id)
        .in('status', ['accepted', 'picked_up', 'on_the_way'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Enrich orders with profiles
      const enrichedOrders = await Promise.all((orders || []).map(async (order) => {
        // Customer profile
        const { data: customerProfile } = await supabase
          .from('profiles')
          .select('name, phone')
          .eq('user_id', order.customer_id)
          .maybeSingle();

        // Shop owner profile
        let shopPhone = '';
        if (order.shop?.user_id) {
          const { data: shopkeeperProfile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('user_id', order.shop.user_id)
            .maybeSingle();
          shopPhone = shopkeeperProfile?.phone || '';
        }

        return {
          ...order,
          customerName: customerProfile?.name || 'Student',
          customerPhone: customerProfile?.phone || 'Not provided',
          shopPhone: shopPhone || 'Not provided',
        } as ActiveOrder;
      }));

      return enrichedOrders;
    },
    refetchInterval: 10000,
  });

  // Sync arrival states and expand states
  useEffect(() => {
    const arrivals: Record<string, boolean> = {};
    const expands: Record<string, boolean> = {};
    
    activeOrders.forEach((order, idx) => {
      arrivals[order.id] = localStorage.getItem(`runner_arrived_${order.id}`) === 'true';
      expands[order.id] = idx === 0; // Expand first order by default
    });

    setArrivedOrders(arrivals);
    setExpandedOrders(prev => ({ ...expands, ...prev }));
  }, [activeOrders]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const setArrived = (orderId: string, val: boolean) => {
    localStorage.setItem(`runner_arrived_${orderId}`, String(val));
    setArrivedOrders(prev => ({ ...prev, [orderId]: val }));
  };

  const toggleItemCheck = (itemId: string) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: (_, { orderId, newStatus }) => {
      let message = '';
      if (newStatus === 'picked_up') {
        message = 'Status updated: Picked up order!';
      } else if (newStatus === 'on_the_way') {
        message = 'Status updated: You are on the way!';
      } else if (newStatus === 'delivered') {
        message = 'Delivery completed successfully!';
        // Clean up local storage
        localStorage.removeItem(`runner_arrived_${orderId}`);
      }
      
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['runner-active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['runner-orders-data'] });
    },
    onError: () => {
      toast.error('Failed to update order status');
    },
  });

  const getStepIndex = (order: ActiveOrder) => {
    const arrived = arrivedOrders[order.id];
    if (order.status === 'accepted') {
      return arrived ? 1 : 0;
    }
    if (order.status === 'picked_up') return 2;
    if (order.status === 'on_the_way') return 2; // Combine picked and on_the_way visually or display as step 2
    if (order.status === 'delivered') return 3;
    return 0;
  };

  const getStatusControl = (order: ActiveOrder) => {
    const arrived = arrivedOrders[order.id];
    const stepIndex = getStepIndex(order);

    if (order.status === 'accepted') {
      if (!arrived) {
        return (
          <Button
            variant="runner"
            className="w-full font-bold h-12"
            onClick={() => {
              setArrived(order.id, true);
              toast.success('Arrival confirmed! Check the shop items.');
            }}
          >
            <MapPin className="w-4.5 h-4.5 mr-2 animate-bounce" /> Confirm Arrival at Shop
          </Button>
        );
      } else {
        // Arrived at shop, runner should verify items before confirming pickup
        return (
          <Button
            variant="runner"
            className="w-full font-bold h-12"
            onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'picked_up' })}
            disabled={updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <>
                <ShoppingBag className="w-4.5 h-4.5 mr-2" /> Confirm Order Pickup
              </>
            )}
          </Button>
        );
      }
    } else if (order.status === 'picked_up') {
      return (
        <Button
          variant="runner"
          className="w-full font-bold h-12"
          onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'on_the_way' })}
          disabled={updateStatusMutation.isPending}
        >
          {updateStatusMutation.isPending ? (
            <Loader2 className="w-4.5 h-4.5 animate-spin" />
          ) : (
            <>
              <Navigation className="w-4.5 h-4.5 mr-2" /> Start Delivery (On the Way)
            </>
          )}
        </Button>
      );
    } else if (order.status === 'on_the_way') {
      return (
        <Button
          variant="runner"
          className="w-full font-bold h-12 bg-success hover:bg-success/90 border-success"
          onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'delivered' })}
          disabled={updateStatusMutation.isPending}
        >
          {updateStatusMutation.isPending ? (
            <Loader2 className="w-4.5 h-4.5 animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-4.5 h-4.5 mr-2" /> Confirm Delivery
            </>
          )}
        </Button>
      );
    }
    return null;
  };

  const getGoogleMapsLink = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const handleCall = (phone: string) => {
    if (phone === 'Not provided' || !phone) {
      toast.error('Phone number not available');
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 pb-24">
      <Header title="Active Deliveries" showNotification />

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-card rounded-2xl border border-dashed p-6 shadow-sm"
          >
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-40 text-primary" />
            <h2 className="text-lg font-bold mb-1">No Active Tasks</h2>
            <p className="text-muted-foreground text-xs mb-6">
              You don't have any active deliveries assigned right now.
            </p>
            <Button variant="runner" onClick={() => window.location.href = '/runner'}>
              Find Available Orders
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {activeOrders.map((order) => {
              const isExpanded = !!expandedOrders[order.id];
              const stepIndex = getStepIndex(order);

              return (
                <div key={order.id} className="rounded-3xl bg-card border border-border shadow-card overflow-hidden">
                  {/* Collapsible Header */}
                  <button
                    onClick={() => toggleExpand(order.id)}
                    className="w-full flex items-center justify-between p-4 bg-muted/20 border-b hover:bg-muted/40 transition-colors"
                  >
                    <div className="text-left">
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">
                        Order #{order.id.slice(0, 8)}
                      </span>
                      <h3 className="font-bold text-foreground mt-1">{order.shop?.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Dropoff: {order.customerName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-success">{order.delivery_fee} ETB</span>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-5">
                          {/* Workflow Stepper */}
                          <div>
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Delivery Progress</h4>
                            <div className="relative pl-6 space-y-4 border-l border-border/80 ml-3">
                              {[
                                { label: 'Order Accepted', desc: 'Runner assigned to delivery' },
                                { label: 'Arrived at Shop', desc: 'Awaiting order pickup' },
                                { label: 'Picked Up & On the Way', desc: 'Heading towards dorm/location' },
                                { label: 'Delivered', desc: 'Completed successfully' }
                              ].map((step, idx) => {
                                const isDone = stepIndex >= idx;
                                const isCurrent = stepIndex === idx;

                                return (
                                  <div key={step.label} className="relative">
                                    <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                                      isDone 
                                        ? 'bg-success border-success text-white' 
                                        : 'bg-card border-border text-muted-foreground'
                                    }`}>
                                      {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                    </div>
                                    <div>
                                      <p className={`text-xs font-bold ${isCurrent ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {step.label}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Pickup Info Card */}
                          <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Pickup Location</span>
                                <h4 className="font-bold text-foreground text-sm">{order.shop?.name}</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">{order.shop?.location || 'Address not set'}</p>
                              </div>
                              <div className="flex gap-1.5">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleCall(order.shopPhone)}
                                  className="w-8 h-8 rounded-lg border-border hover:bg-muted"
                                >
                                  <Phone className="w-4 h-4 text-primary" />
                                </Button>
                                {order.shop?.location && (
                                  <a
                                    href={getGoogleMapsLink(order.shop.location)}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="w-8 h-8 rounded-lg border-border hover:bg-muted"
                                    >
                                      <Navigation className="w-4 h-4 text-primary" />
                                    </Button>
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Checklist of Items */}
                            <div className="border-t border-border/60 pt-3">
                              <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                                Verify Items Checklist:
                              </p>
                              <div className="space-y-1.5">
                                {order.order_items?.map((item) => {
                                  const isChecked = !!checkedItems[item.id];
                                  return (
                                    <button
                                      key={item.id}
                                      onClick={() => toggleItemCheck(item.id)}
                                      className="w-full flex items-center gap-2 text-left py-1 text-xs hover:bg-muted/40 rounded px-1"
                                    >
                                      {isChecked ? (
                                        <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                                      ) : (
                                        <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                                      )}
                                      <span className={isChecked ? 'line-through text-muted-foreground' : 'text-foreground'}>
                                        {item.quantity}x {item.product_name}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Customer Info Card */}
                          <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Customer Dropoff</span>
                                <h4 className="font-bold text-foreground text-sm">{order.customerName}</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">{order.delivery_address || 'Address not set'}</p>
                              </div>
                              <div className="flex gap-1.5">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleCall(order.customerPhone)}
                                  className="w-8 h-8 rounded-lg border-border hover:bg-muted"
                                >
                                  <Phone className="w-4 h-4 text-primary" />
                                </Button>
                                {order.delivery_address && (
                                  <a
                                    href={getGoogleMapsLink(order.delivery_address)}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="w-8 h-8 rounded-lg border-border hover:bg-muted"
                                    >
                                      <Navigation className="w-4 h-4 text-primary" />
                                    </Button>
                                  </a>
                                )}
                              </div>
                            </div>

                            {order.notes && (
                              <div className="border-t border-border/60 pt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                                <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                                <p className="italic leading-relaxed">
                                  <strong>Note:</strong> "{order.notes}"
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Status control buttons */}
                          <div className="pt-2">
                            {getStatusControl(order)}
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
