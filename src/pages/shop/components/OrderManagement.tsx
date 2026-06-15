import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Printer,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  ShoppingBag,
  User,
  Truck,
  FileText,
  MapPin,
  Phone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Shop {
  id: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  customer_id: string;
  runner_id: string | null;
  status: string;
  total_amount: number;
  delivery_fee: number;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
  shop_rating: number | null;
  shop_review: string | null;
  order_items: OrderItem[];
}

export function OrderManagement({ shop }: { shop: Shop }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('');

  // 1. Fetch orders
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['shop-management-orders', shop.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          customer_id,
          runner_id,
          status,
          total_amount,
          delivery_fee,
          delivery_address,
          notes,
          created_at,
          shop_rating,
          shop_review,
          order_items(id, product_name, quantity, unit_price)
        `)
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // 2. Fetch profiles (for customer & runner details)
  const { data: profilesMap = new Map() } = useQuery({
    queryKey: ['shop-orders-profiles-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, phone, email, university');
      if (error) throw error;
      const map = new Map<string, { name: string; phone: string; email: string; university: string }>();
      data?.forEach((p) => {
        map.set(p.user_id, { 
          name: p.name, 
          phone: p.phone || 'N/A', 
          email: p.email,
          university: p.university || 'AAU'
        });
      });
      return map;
    },
  });

  // 3. Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(`Order status updated to ${variables.newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['shop-management-orders'] });
      queryClient.invalidateQueries({ queryKey: ['shop-dashboard-orders'] });
      
      // Update locally selected order details
      if (selectedOrder && selectedOrder.id === variables.orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: variables.newStatus } : null);
      }
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.message || 'Failed to update order status');
    },
  });

  // Filter & Search computation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const customer = profilesMap.get(order.customer_id) || { name: '', phone: '' };
      const matchesSearch = 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm);

      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      const matchesDate = !dateFilter || orderDate === dateFilter;

      const matchesTab = 
        activeTab === 'all' ||
        (activeTab === 'pending' && order.status === 'pending') ||
        (activeTab === 'preparing' && order.status === 'preparing') ||
        (activeTab === 'ready' && order.status === 'ready') ||
        (activeTab === 'completed' && order.status === 'delivered') ||
        (activeTab === 'cancelled' && order.status === 'cancelled') ||
        (activeTab === 'active' && ['accepted', 'preparing', 'ready', 'picked_up', 'on_the_way'].includes(order.status));

      return matchesSearch && matchesDate && matchesTab;
    });
  }, [orders, searchTerm, dateFilter, activeTab, profilesMap]);

  const handlePrintReceipt = () => {
    window.print();
  };

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Order Management</h2>
          <p className="text-muted-foreground text-sm">Accept, prepare, and monitor fulfillment of student orders.</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full mb-6">
          <TabsTrigger value="all" className="text-xs">All Orders</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs relative">
            New
            {pendingOrders.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-warning text-white text-[9px] font-bold animate-pulse-soft">
                {pendingOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="preparing" className="text-xs relative">
            Preparing
            {preparingOrders.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary text-white text-[9px] font-bold">
                {preparingOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ready" className="text-xs relative">
            Ready
            {readyOrders.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-success text-white text-[9px] font-bold">
                {readyOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs">In Progress</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">Delivered</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-center mb-6">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, order ID, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 border-border/80"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9 h-10 border-border/80 text-xs"
              />
            </div>
            {dateFilter && (
              <Button variant="ghost" size="sm" onClick={() => setDateFilter('')} className="text-xs">
                Clear Date
              </Button>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <Card className="border border-border/60 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-success" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <h3 className="text-sm font-semibold">No Orders Found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Try adjusting your search terms, applying a different status filter, or clearing the date.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase font-semibold">
                      <th className="py-3.5 px-4">Order ID</th>
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Items Count</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Total Payout</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredOrders.map((order) => {
                      const cust = profilesMap.get(order.customer_id) || { name: 'Student', phone: '' };
                      const itemsCount = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                      return (
                        <tr 
                          key={order.id} 
                          className="hover:bg-muted/20 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <td className="py-4 px-4 font-semibold text-xs text-foreground">
                            #{order.id.slice(-6).toUpperCase()}
                          </td>
                          <td className="py-4 px-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(order.created_at).toLocaleString(undefined, { 
                                dateStyle: 'short', 
                                timeStyle: 'short' 
                              })}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-semibold text-xs text-foreground">{cust.name}</p>
                            <p className="text-[10px] text-muted-foreground">{cust.phone}</p>
                          </td>
                          <td className="py-4 px-4 text-xs font-medium text-foreground/80">
                            {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                          </td>
                          <td className="py-4 px-4">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                              order.status === 'pending' ? 'bg-warning/10 text-warning border border-warning/20' :
                              order.status === 'accepted' ? 'bg-accent/10 text-accent border border-accent/20' :
                              order.status === 'preparing' ? 'bg-primary/10 text-primary border border-primary/20' :
                              order.status === 'ready' ? 'bg-success/10 text-success border border-success/20' :
                              order.status === 'delivered' ? 'bg-muted text-muted-foreground border border-border' : 
                              'bg-destructive/10 text-destructive border border-destructive/20'
                            )}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-bold text-xs text-foreground">
                            {(Number(order.total_amount) + Number(order.delivery_fee)).toFixed(0)} ETB
                          </td>
                          <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center gap-1">
                              {order.status === 'pending' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-xs px-2 text-destructive border-destructive/20 hover:bg-destructive/10"
                                    onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'cancelled' })}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <XCircle className="w-3.5 h-3.5 mr-1" />
                                    Reject
                                  </Button>
                                  <Button 
                                    variant="shop" 
                                    size="sm" 
                                    className="h-8 text-xs px-2"
                                    onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'accepted' })}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                    Accept
                                  </Button>
                                </>
                              )}
                              {order.status === 'accepted' && (
                                <Button 
                                  variant="shop" 
                                  size="sm" 
                                  className="h-8 text-xs px-3"
                                  onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'preparing' })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  Start Preparing
                                </Button>
                              )}
                              {order.status === 'preparing' && (
                                <Button 
                                  variant="shop" 
                                  size="sm" 
                                  className="h-8 text-xs px-3"
                                  onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'ready' })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  Ready for Pickup
                                </Button>
                              )}
                              {['ready', 'picked_up', 'on_the_way', 'delivered', 'cancelled'].includes(order.status) && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 text-xs text-muted-foreground"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setIsDetailsOpen(true);
                                  }}
                                >
                                  View details
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Details Sheet Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex justify-between items-center pr-6">
              <span>Order Details</span>
              <span className={cn(
                "text-xs px-3 py-1 rounded-full border",
                selectedOrder?.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' :
                selectedOrder?.status === 'accepted' ? 'bg-accent/10 text-accent border-accent/20' :
                selectedOrder?.status === 'preparing' ? 'bg-primary/10 text-primary border-primary/20' :
                selectedOrder?.status === 'ready' ? 'bg-success/10 text-success border-success/20' :
                selectedOrder?.status === 'delivered' ? 'bg-muted text-muted-foreground border-border' : 
                'bg-destructive/10 text-destructive border-destructive/20'
              )}>
                {selectedOrder?.status.toUpperCase()}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Order ID: #{selectedOrder?.id.toUpperCase()} • Ordered on {selectedOrder && new Date(selectedOrder.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-5 pt-3">
              {/* Product list */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4" /> Ordered Products
                </h3>
                <div className="bg-muted/40 border border-border/60 rounded-2xl p-4 space-y-3">
                  {selectedOrder.order_items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-foreground">{item.product_name}</p>
                        <p className="text-[10px] text-muted-foreground">Quantity: {item.quantity} x {item.unit_price} ETB</p>
                      </div>
                      <span className="font-bold text-xs">{(item.unit_price * item.quantity).toFixed(0)} ETB</span>
                    </div>
                  ))}
                  <div className="border-t border-border/50 pt-3 flex justify-between items-center text-xs font-semibold text-muted-foreground">
                    <span>Delivery Fee</span>
                    <span>{Number(selectedOrder.delivery_fee).toFixed(0)} ETB</span>
                  </div>
                  <div className="border-t border-border/80 pt-3 flex justify-between items-center text-sm font-bold text-foreground">
                    <span>Total Payout</span>
                    <span>{(Number(selectedOrder.total_amount) + Number(selectedOrder.delivery_fee)).toFixed(0)} ETB</span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4" /> Customer Info
                  </h3>
                  <div className="bg-muted/20 border border-border/40 rounded-2xl p-3 text-xs space-y-1.5">
                    <p className="font-bold text-foreground">{profilesMap.get(selectedOrder.customer_id)?.name || 'Student'}</p>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="w-3 h-3" /> {profilesMap.get(selectedOrder.customer_id)?.phone || 'N/A'}
                    </p>
                    <p className="text-muted-foreground truncate">{profilesMap.get(selectedOrder.customer_id)?.email}</p>
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-4 h-4" /> Runner Info
                  </h3>
                  <div className="bg-muted/20 border border-border/40 rounded-2xl p-3 text-xs space-y-1.5 min-h-[78px] flex flex-col justify-center">
                    {selectedOrder.runner_id ? (
                      <>
                        <p className="font-bold text-foreground">{profilesMap.get(selectedOrder.runner_id)?.name || 'Delivery Runner'}</p>
                        <p className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="w-3 h-3" /> {profilesMap.get(selectedOrder.runner_id)?.phone || 'N/A'}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground italic text-center">No runner assigned yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Delivery Address & Notes */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Delivery Location
                </h3>
                <div className="bg-muted/20 border border-border/40 rounded-2xl p-3 text-xs space-y-1">
                  <p className="font-medium text-foreground">{selectedOrder.delivery_address || 'No specific location provided'}</p>
                  {selectedOrder.notes && (
                    <p className="text-[10px] text-muted-foreground italic mt-1.5 pt-1.5 border-t border-border/30">
                      Note: {selectedOrder.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:justify-between items-center gap-2 mt-4 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => setIsReceiptOpen(true)}
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </Button>
            <div className="flex gap-2">
              {selectedOrder?.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive text-xs h-9 border-destructive/20 hover:bg-destructive/10"
                    onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, newStatus: 'cancelled' })}
                    disabled={updateStatusMutation.isPending}
                  >
                    Reject Order
                  </Button>
                  <Button
                    variant="shop"
                    size="sm"
                    className="text-xs h-9"
                    onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, newStatus: 'accepted' })}
                    disabled={updateStatusMutation.isPending}
                  >
                    Accept Order
                  </Button>
                </>
              )}
              {selectedOrder?.status === 'accepted' && (
                <Button
                  variant="shop"
                  size="sm"
                  className="text-xs h-9"
                  onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, newStatus: 'preparing' })}
                  disabled={updateStatusMutation.isPending}
                >
                  Start Preparing
                </Button>
              )}
              {selectedOrder?.status === 'preparing' && (
                <Button
                  variant="shop"
                  size="sm"
                  className="text-xs h-9"
                  onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, newStatus: 'ready' })}
                  disabled={updateStatusMutation.isPending}
                >
                  Mark Ready
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Receipt Modal */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-white text-black dark:text-black">
          <div id="printable-receipt" className="p-4 bg-white text-black font-sans leading-relaxed">
            {/* Receipt Header */}
            <div className="text-center pb-4 border-b border-dashed border-gray-400 space-y-1">
              <h2 className="text-xl font-bold uppercase tracking-wider">Uni Gebeya</h2>
              <p className="text-xs font-semibold uppercase">{shop.id ? 'Shop Receipt' : 'Order Slip'}</p>
              <p className="text-[10px] text-gray-500">{new Date(selectedOrder?.created_at || '').toLocaleString()}</p>
              <p className="text-[10px] font-bold">ORDER SLIP: #{selectedOrder?.id.slice(-6).toUpperCase()}</p>
            </div>

            {/* Receipt Items */}
            <div className="py-4 border-b border-dashed border-gray-400 space-y-2.5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-300 font-bold">
                    <th className="pb-1 text-left">ITEM</th>
                    <th className="pb-1 text-center">QTY</th>
                    <th className="pb-1 text-right">PRICE</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder?.order_items?.map((item) => (
                    <tr key={item.id} className="text-gray-700">
                      <td className="py-1 text-left font-medium">{item.product_name}</td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right font-semibold">{(item.unit_price * item.quantity).toFixed(0)} ETB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="py-3 border-b border-dashed border-gray-400 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold">{Number(selectedOrder?.total_amount || 0).toFixed(0)} ETB</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="font-semibold">{Number(selectedOrder?.delivery_fee || 0).toFixed(0)} ETB</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1.5">
                <span>TOTAL PAID</span>
                <span>{(Number(selectedOrder?.total_amount || 0) + Number(selectedOrder?.delivery_fee || 0)).toFixed(0)} ETB</span>
              </div>
            </div>

            {/* Customer Slip Details */}
            <div className="py-3 text-[10px] text-gray-600 space-y-1">
              <p><span className="font-bold uppercase text-gray-800">Customer:</span> {profilesMap.get(selectedOrder?.customer_id || '')?.name}</p>
              <p><span className="font-bold uppercase text-gray-800">Phone:</span> {profilesMap.get(selectedOrder?.customer_id || '')?.phone}</p>
              <p><span className="font-bold uppercase text-gray-800">Location:</span> {selectedOrder?.delivery_address}</p>
              {selectedOrder?.notes && (
                <p className="italic bg-gray-100 p-1.5 rounded-md border border-gray-200 mt-1">
                  Note: {selectedOrder.notes}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-dashed border-gray-400 text-[9px] text-gray-400 font-medium">
              <p>Thank you for ordering with Uni Gebeya!</p>
              <p>Powered by Supabase & React</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              className="text-xs bg-slate-100 text-black hover:bg-slate-200"
              onClick={() => setIsReceiptOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="shop"
              className="text-xs"
              onClick={handlePrintReceipt}
            >
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* CSS style hook to handle clean printer layout */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
