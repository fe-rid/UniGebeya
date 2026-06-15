import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Star,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Layers,
  ArrowUpRight,
  TrendingDown,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';

interface Shop {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock_quantity: number;
  is_available: boolean;
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
  status: string;
  total_amount: number;
  created_at: string;
  shop_rating: number | null;
  shop_review: string | null;
  order_items: OrderItem[];
}

export function DashboardOverview({ shop }: { shop: Shop }) {
  const navigate = useNavigate();

  // 1. Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['shop-dashboard-products', shop.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, category, stock_quantity, is_available')
        .eq('shop_id', shop.id);
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Fetch orders
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['shop-dashboard-orders', shop.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          customer_id,
          status,
          total_amount,
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

  // 3. Fetch customers lookup
  const { data: customersMap = new Map() } = useQuery({
    queryKey: ['shop-dashboard-customers-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, phone');
      if (error) throw error;
      const map = new Map<string, { name: string; phone: string }>();
      data?.forEach((p) => {
        map.set(p.user_id, { name: p.name, phone: p.phone || '' });
      });
      return map;
    },
  });

  // Metrics calculation
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const newOrders = orders.filter((o) => o.status === 'pending').length;
    const pendingOrders = orders.filter((o) => o.status === 'accepted').length;
    const preparingOrders = orders.filter((o) => o.status === 'preparing').length;
    const readyOrders = orders.filter((o) => o.status === 'ready').length;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;

    // Revenue calculations
    const today = new Date().toDateString();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    let todayRevenue = 0;
    let weeklyRevenue = 0;
    let monthlyRevenue = 0;
    let ratingsSum = 0;
    let ratingsCount = 0;

    orders.forEach((o) => {
      const orderDate = new Date(o.created_at);
      const isDelivered = o.status === 'delivered';

      if (isDelivered) {
        if (orderDate.toDateString() === today) {
          todayRevenue += Number(o.total_amount);
        }
        if (orderDate >= oneWeekAgo) {
          weeklyRevenue += Number(o.total_amount);
        }
        if (orderDate >= oneMonthAgo) {
          monthlyRevenue += Number(o.total_amount);
        }
      }

      if (o.shop_rating !== null && o.shop_rating !== undefined) {
        ratingsSum += o.shop_rating;
        ratingsCount += 1;
      }
    });

    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.is_available).length;
    const outOfStockProducts = products.filter((p) => p.stock_quantity === 0).length;
    const avgRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

    return {
      totalOrders,
      newOrders,
      pendingOrders,
      preparingOrders,
      readyOrders,
      deliveredOrders,
      cancelledOrders,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      totalProducts,
      activeProducts,
      outOfStockProducts,
      avgRating,
      ratingsCount
    };
  }, [orders, products]);

  // Chart Data compilation
  const chartData = useMemo(() => {
    // 1. Daily sales (last 7 days)
    const daily: Record<string, { name: string; sales: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toLocaleDateString(undefined, { weekday: 'short' });
      daily[d.toDateString()] = { name: str, sales: 0, orders: 0 };
    }

    // 2. Monthly revenue (last 6 months)
    const monthly: Record<string, { name: string; revenue: number; orders: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const str = d.toLocaleDateString(undefined, { month: 'short' });
      monthly[`${d.getFullYear()}-${d.getMonth()}`] = { name: str, revenue: 0, orders: 0 };
    }

    orders.forEach((o) => {
      const date = new Date(o.created_at);
      const dayKey = date.toDateString();
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const amount = Number(o.total_amount);

      if (daily[dayKey] && o.status === 'delivered') {
        daily[dayKey].sales += amount;
        daily[dayKey].orders += 1;
      }
      if (monthly[monthKey] && o.status === 'delivered') {
        monthly[monthKey].revenue += amount;
        monthly[monthKey].orders += 1;
      }
    });

    // 3. Product performance (top products sold)
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    orders.forEach((o) => {
      if (o.status === 'delivered') {
        o.order_items?.forEach((item) => {
          if (!productSales[item.product_name]) {
            productSales[item.product_name] = { name: item.product_name, quantity: 0, revenue: 0 };
          }
          productSales[item.product_name].quantity += item.quantity;
          productSales[item.product_name].revenue += item.quantity * Number(item.unit_price);
        });
      }
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      daily: Object.values(daily),
      monthly: Object.values(monthly),
      topProducts
    };
  }, [orders]);

  // Low stock alerts
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock_quantity <= 5).slice(0, 5);
  }, [products]);

  // Recent reviews
  const recentReviews = useMemo(() => {
    return orders
      .filter((o) => o.shop_rating !== null)
      .slice(0, 5);
  }, [orders]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Overview</h2>
          <p className="text-muted-foreground text-sm">Real-time indicators and operational tools for {shop.name}.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Today's Revenue", value: `${metrics.todayRevenue.toLocaleString()} ETB`, icon: TrendingUp, color: "text-success bg-success/10" },
          { title: "Total Orders", value: metrics.totalOrders, icon: ShoppingBag, color: "text-primary bg-primary/10" },
          { title: "Active Products", value: `${metrics.activeProducts}/${metrics.totalProducts}`, icon: Package, color: "text-accent bg-accent/10" },
          { title: "Avg Shop Rating", value: metrics.avgRating > 0 ? `⭐ ${metrics.avgRating.toFixed(1)}` : '—', desc: `${metrics.ratingsCount} reviews`, icon: Star, color: "text-warning bg-warning/10" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border border-border/60 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{stat.title}</p>
                    <p className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
                    {stat.desc && <p className="text-xs text-muted-foreground font-medium">{stat.desc}</p>}
                  </div>
                  <div className={cn("p-2.5 rounded-xl", stat.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Order Status Stepper Overview */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "New (Pending)", val: metrics.newOrders, color: "bg-warning/10 text-warning" },
          { label: "Accepted", val: metrics.pendingOrders, color: "bg-accent/10 text-accent" },
          { label: "Preparing", val: metrics.preparingOrders, color: "bg-primary/10 text-primary" },
          { label: "Ready", val: metrics.readyOrders, color: "bg-success/10 text-success" },
          { label: "Delivered", val: metrics.deliveredOrders, color: "bg-muted text-foreground" },
          { label: "Cancelled", val: metrics.cancelledOrders, color: "bg-destructive/10 text-destructive" },
        ].map((item, idx) => (
          <div key={idx} className={cn("flex flex-col items-center justify-center p-3 rounded-2xl border border-border/50 text-center bg-card shadow-sm")}>
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full mb-1", item.color)}>
              {item.val}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Bar Chart */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Daily Sales Trend</CardTitle>
            <CardDescription>Sales revenue in ETB over the past week</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                <Tooltip formatter={(v) => [`${v} ETB`, 'Sales']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="sales" fill="hsl(142, 76%, 36%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Revenue Area Chart */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Revenue Performance</CardTitle>
            <CardDescription>Monthly completed order revenue trends</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.monthly}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [`${v} ETB`, 'Revenue']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(142, 76%, 36%)" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Widgets & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 border border-border/60 shadow-sm flex flex-col justify-between">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <div>
              <CardTitle className="text-lg">Recent Orders</CardTitle>
              <CardDescription>Monitor your incoming student orders</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/shop/orders')} className="text-xs text-success">
              View All Orders
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-muted-foreground text-xs uppercase font-semibold">
                  <th className="py-3 px-2">Order ID</th>
                  <th className="py-3 px-2">Customer</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {orders.slice(0, 5).map((order) => {
                  const cust = customersMap.get(order.customer_id) || { name: 'Student', phone: '' };
                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-2 font-semibold text-xs">#{order.id.slice(-6).toUpperCase()}</td>
                      <td className="py-3.5 px-2">
                        <p className="font-semibold text-foreground text-xs leading-none mb-1">{cust.name}</p>
                        <p className="text-[10px] text-muted-foreground leading-none">{cust.phone}</p>
                      </td>
                      <td className="py-3.5 px-2">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
                          order.status === 'pending' ? 'bg-warning/10 text-warning' :
                          order.status === 'accepted' ? 'bg-accent/10 text-accent' :
                          order.status === 'preparing' ? 'bg-primary/10 text-primary' :
                          order.status === 'ready' ? 'bg-success/10 text-success' :
                          order.status === 'delivered' ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive'
                        )}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-right font-bold text-xs text-foreground">{Number(order.total_amount).toFixed(0)} ETB</td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-muted-foreground">
                      No recent orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Low Stock Alerts & Product Performance */}
        <div className="space-y-6">
          {/* Low Stock alerts */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-warning">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>Items needing replenishment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="flex justify-between items-center p-2 rounded-xl bg-muted/35 border border-border/50 text-sm">
                  <span className="font-semibold text-xs truncate max-w-[140px]">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold",
                      p.stock_quantity === 0 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-warning/10 text-warning"
                    )}>
                      {p.stock_quantity === 0 ? "Out of Stock" : `${p.stock_quantity} left`}
                    </span>
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => navigate('/shop/inventory')}>
                      <ArrowUpRight className="w-4 h-4 text-success" />
                    </Button>
                  </div>
                </div>
              ))}
              {lowStockProducts.length === 0 && (
                <p className="text-center py-4 text-xs text-muted-foreground">All products are well stocked!</p>
              )}
            </CardContent>
          </Card>

          {/* Top Selling Products */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Top Selling Items</CardTitle>
              <CardDescription>Most popular products by volume</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {chartData.topProducts.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-success/10 text-success text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-xs truncate max-w-[140px]">{p.name}</span>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">{p.quantity} units</span>
                </div>
              ))}
              {chartData.topProducts.length === 0 && (
                <p className="text-center py-4 text-xs text-muted-foreground">No sales registered yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Reviews Snippet */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-success" />
            Recent Reviews
          </CardTitle>
          <CardDescription>What student customers say about your shop</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {recentReviews.map((rev) => {
            const cust = customersMap.get(rev.customer_id) || { name: 'Student' };
            return (
              <div key={rev.id} className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-3.5 h-3.5",
                          i < (rev.shop_rating || 0) 
                            ? "fill-warning text-warning" 
                            : "text-muted-foreground/30"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-foreground/80 italic line-clamp-2">
                    "{rev.shop_review || 'No comment review left.'}"
                  </p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-foreground/70">{cust.name}</span>
                  <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
          {recentReviews.length === 0 && (
            <p className="col-span-full text-center py-8 text-xs text-muted-foreground">No customer reviews yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
