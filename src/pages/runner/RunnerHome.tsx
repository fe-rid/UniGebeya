import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, MapPin, DollarSign, Clock, CheckCircle, Loader2, Star, 
  Bike, Search, Filter, RefreshCw, ArrowRight, Eye, User, TrendingUp
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

interface Order {
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
  }[];
  customerName?: string;
  customerPhone?: string;
  shopPhone?: string;
}

const getSimulatedDistance = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return (Math.abs(hash) % 22 + 3) / 10; // 0.3 to 2.5 km
};

export default function RunnerHome() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(user?.isOnline ?? true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'available'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [distanceFilter, setDistanceFilter] = useState<'all' | 'under1' | '1to2' | 'over2'>('all');
  const [feeFilter, setFeeFilter] = useState<'all' | 'under20' | '20to40' | 'over40'>('all');

  const queryClient = useQueryClient();

  // Fetch runner's orders (active, delivered, cancelled) and calculate stats & active tasks
  const { data: runnerData, isLoading: runnerOrdersLoading } = useQuery({
    queryKey: ['runner-orders-data', user?.id],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return { orders: [], activeOrder: null, stats: { todayDeliveriesCount: 0, todayEarnings: 0, weekEarnings: 0, successRate: 100 } };

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
          order_items(id, product_name, quantity)
        `)
        .eq('runner_id', session.session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Find active order
      const active = orders?.find(o => ['accepted', 'picked_up', 'on_the_way'].includes(o.status));
      let activeWithDetails = active ? { ...active } : null;

      if (active) {
        const { data: customerProfile } = await supabase
          .from('profiles')
          .select('name, phone')
          .eq('user_id', active.customer_id)
          .maybeSingle();

        let shopPhone = '';
        if (active.shop?.user_id) {
          const { data: shopkeeperProfile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('user_id', active.shop.user_id)
            .maybeSingle();
          shopPhone = shopkeeperProfile?.phone || '';
        }

        activeWithDetails = {
          ...active,
          customerName: customerProfile?.name || 'Student',
          customerPhone: customerProfile?.phone || 'No phone',
          shopPhone: shopPhone || 'No phone',
        };
      }

      // Calculate stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const delivered = orders?.filter(o => o.status === 'delivered') || [];
      const cancelled = orders?.filter(o => o.status === 'cancelled') || [];

      const todayDeliveries = delivered.filter(o => new Date(o.created_at) >= todayStart);
      const todayEarnings = todayDeliveries.reduce((sum, o) => sum + Number(o.delivery_fee), 0);

      const weekDeliveries = delivered.filter(o => new Date(o.created_at) >= weekStart);
      const weekEarnings = weekDeliveries.reduce((sum, o) => sum + Number(o.delivery_fee), 0);

      const totalCompleted = delivered.length;
      const totalAttempted = totalCompleted + cancelled.length;
      const successRate = totalAttempted > 0 ? Math.round((totalCompleted / totalAttempted) * 100) : 100;

      return {
        orders: orders || [],
        activeOrder: activeWithDetails,
        stats: {
          todayDeliveriesCount: todayDeliveries.length,
          todayEarnings,
          weekEarnings,
          successRate,
        }
      };
    },
    enabled: !!user?.id,
  });

  // Fetch available orders (accepted by shop, no runner assigned)
  const { data: availableOrders = [], isLoading: availableLoading, refetch: refetchAvailable } = useQuery({
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
          notes,
          customer_id,
          shop:shops(id, name, location),
          order_items(id, product_name, quantity)
        `)
        .in('status', ['accepted', 'ready'])
        .is('runner_id', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as Order[];
    },
    enabled: isOnline,
  });

  // Real-time subscription for available orders
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
        () => {
          queryClient.invalidateQueries({ queryKey: ['available-orders'] });
          queryClient.invalidateQueries({ queryKey: ['runner-orders-data'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOnline, queryClient]);

  // Accept order mutation
  const acceptMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('orders')
        .update({ 
          runner_id: session.session.user.id
        })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Order accepted! Head to the active delivery page.');
      queryClient.invalidateQueries({ queryKey: ['available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['runner-orders-data'] });
      setActiveTab('dashboard');
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

  const handleRefresh = async () => {
    await Promise.all([refetchAvailable(), queryClient.invalidateQueries({ queryKey: ['runner-orders-data'] })]);
    toast.success('Orders refreshed');
  };

  const filteredAvailableOrders = availableOrders.filter(order => {
    const matchesSearch = 
      order.shop?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.delivery_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;

    const distance = getSimulatedDistance(order.id);
    let matchesDistance = true;
    if (distanceFilter === 'under1') matchesDistance = distance <= 1.0;
    else if (distanceFilter === '1to2') matchesDistance = distance > 1.0 && distance <= 2.0;
    else if (distanceFilter === 'over2') matchesDistance = distance > 2.0;

    let matchesFee = true;
    const fee = Number(order.delivery_fee);
    if (feeFilter === 'under20') matchesFee = fee < 20;
    else if (feeFilter === '20to40') matchesFee = fee >= 20 && fee <= 40;
    else if (feeFilter === 'over40') matchesFee = fee > 40;

    return matchesSearch && matchesDistance && matchesFee;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 pb-24">
      <Header title="Runner Station" showNotification />

      {/* Tabs segment */}
      <div className="flex border-b border-border bg-card sticky top-14 z-10">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'dashboard'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'available'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Available Orders
          {availableOrders.length > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-bold">
              {availableOrders.length}
            </span>
          )}
        </button>
      </div>

      <div className="px-4 py-4">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {/* Online/Offline Toggle card */}
              <div className={`p-5 rounded-3xl mb-6 shadow-md transition-all duration-300 ${
                isOnline 
                  ? 'gradient-runner text-white' 
                  : 'bg-card text-card-foreground border border-border/60'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-1.5">
                      <Bike className="w-5 h-5" />
                      {isOnline ? "You're Online" : "You're Offline"}
                    </h3>
                    <p className={`text-xs mt-0.5 ${isOnline ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {isOnline ? "Ready to accept nearby orders" : "Toggle to start receiving deliveries"}
                    </p>
                  </div>
                  <Switch 
                    checked={isOnline} 
                    onCheckedChange={toggleOnline} 
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-3 px-1">Today's Performance</h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-card p-4 rounded-2xl border shadow-card flex flex-col justify-between h-28">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-muted-foreground font-semibold">Today's Profit</span>
                    <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center text-success">
                      <DollarSign className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-foreground">{runnerData?.stats.todayEarnings || 0} ETB</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">From {runnerData?.stats.todayDeliveriesCount || 0} tasks</p>
                  </div>
                </div>

                <div className="bg-card p-4 rounded-2xl border shadow-card flex flex-col justify-between h-28">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-muted-foreground font-semibold">This Week</span>
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <TrendingUp className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-foreground">{runnerData?.stats.weekEarnings || 0} ETB</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Weekly total profit</p>
                  </div>
                </div>

                <div className="bg-card p-4 rounded-2xl border shadow-card flex flex-col justify-between h-28">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-muted-foreground font-semibold">Success Rate</span>
                    <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
                      <CheckCircle className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-foreground">{runnerData?.stats.successRate || 100}%</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Goal is 100%</p>
                  </div>
                </div>

                <div className="bg-card p-4 rounded-2xl border shadow-card flex flex-col justify-between h-28">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-muted-foreground font-semibold">Open Jobs</span>
                    <div className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center text-info">
                      <Package className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-foreground">{availableOrders.length}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{isOnline ? 'Available jobs nearby' : 'Offline'}</p>
                  </div>
                </div>
              </div>

              {/* Active Delivery Card */}
              {runnerData?.activeOrder && (
                <div className="mb-6">
                  <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-3 px-1">Active Delivery</h3>
                  <div className="p-4 rounded-2xl bg-card border border-primary/20 shadow-card">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-base text-foreground">{runnerData.activeOrder.shop?.name}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-primary" /> {runnerData.activeOrder.shop?.location}
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        {runnerData.activeOrder.status === 'accepted' ? 'Assigned' : runnerData.activeOrder.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground border-t border-b border-border/50 py-3 mb-4 space-y-1.5">
                      <div className="flex justify-between">
                        <span>Dropoff to:</span>
                        <span className="font-medium text-foreground">{runnerData.activeOrder.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Address:</span>
                        <span className="font-medium text-foreground truncate max-w-[180px]">{runnerData.activeOrder.delivery_address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Earnings:</span>
                        <span className="font-bold text-success">{runnerData.activeOrder.delivery_fee} ETB</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => navigate('/runner/active')} 
                      className="w-full text-xs font-semibold gap-1"
                      variant="runner"
                    >
                      <Bike className="w-4 h-4" />
                      View Active Steps
                    </Button>
                  </div>
                </div>
              )}

              {/* Quick Actions Panel */}
              <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-3 px-1">Quick Tools</h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('available')}
                  className="h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-sm border-border hover:bg-muted/30"
                >
                  <Search className="w-5 h-5 text-primary" />
                  <span className="text-xs font-bold text-foreground">Find Jobs</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/runner/active')}
                  className="h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-sm border-border hover:bg-muted/30"
                >
                  <Clock className="w-5 h-5 text-warning" />
                  <span className="text-xs font-bold text-foreground">Active Task</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/runner/earnings')}
                  className="h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-sm border-border hover:bg-muted/30"
                >
                  <DollarSign className="w-5 h-5 text-success" />
                  <span className="text-xs font-bold text-foreground">My Earnings</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/runner/profile')}
                  className="h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-sm border-border hover:bg-muted/30"
                >
                  <User className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs font-bold text-foreground">My Profile</span>
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="available"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header block with search filters */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    placeholder="Search by shop or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-card border-border"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleRefresh}
                  className="shrink-0 border-border hover:bg-muted/30"
                >
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              {/* Advanced Filters */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                {/* Distance Filter */}
                <div className="relative">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-3 pointer-events-none" />
                  <select
                    value={distanceFilter}
                    onChange={(e: any) => setDistanceFilter(e.target.value)}
                    className="w-full pl-7 py-2 bg-card border border-border rounded-xl text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="all">Any Distance</option>
                    <option value="under1">Under 1.0 km</option>
                    <option value="1to2">1.0 to 2.0 km</option>
                    <option value="over2">Over 2.0 km</option>
                  </select>
                </div>

                {/* Earnings Filter */}
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-3 pointer-events-none" />
                  <select
                    value={feeFilter}
                    onChange={(e: any) => setFeeFilter(e.target.value)}
                    className="w-full pl-7 py-2 bg-card border border-border rounded-xl text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="all">Any Earning</option>
                    <option value="under20">Under 20 ETB</option>
                    <option value="20to40">20 to 40 ETB</option>
                    <option value="over40">Over 40 ETB</option>
                  </select>
                </div>
              </div>

              {/* Available Jobs list */}
              {isOnline ? (
                availableLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredAvailableOrders.length > 0 ? (
                  <div className="space-y-4">
                    {filteredAvailableOrders.map((order, index) => {
                      const distance = getSimulatedDistance(order.id);
                      return (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-4 rounded-2xl bg-card border border-border shadow-card flex flex-col justify-between"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-bold text-base text-foreground">{order.shop?.name || 'Unknown Shop'}</h4>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-muted-foreground" /> {order.shop?.location || 'No Location'}
                              </p>
                            </div>
                            <span className="text-lg font-black text-success">{order.delivery_fee} ETB</span>
                          </div>

                          <div className="text-xs text-muted-foreground space-y-1 my-3 bg-muted/30 p-2.5 rounded-xl border border-dashed border-border/80">
                            <p className="truncate">📍 <strong>Drop:</strong> {order.delivery_address || 'Not set'}</p>
                            <p>🏃 <strong>Est. Distance:</strong> {distance.toFixed(1)} km</p>
                            <p>📦 <strong>Order:</strong> {order.order_items?.length || 0} item(s)</p>
                          </div>

                          <Button
                            variant="runner"
                            onClick={() => acceptMutation.mutate(order.id)}
                            disabled={acceptMutation.isPending}
                            className="w-full gap-1.5 font-bold"
                          >
                            {acceptMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                Accept & Start <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-dashed border-border/60">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
                    <p className="font-medium text-foreground/80">No matches found</p>
                    <p className="text-xs mt-1">Try resetting the filter options</p>
                  </div>
                )
              ) : (
                <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-dashed border-border/60">
                  <Bike className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
                  <p className="font-medium text-foreground/80">You are offline</p>
                  <p className="text-xs mt-1">Go online at the Dashboard tab to find delivery jobs</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
