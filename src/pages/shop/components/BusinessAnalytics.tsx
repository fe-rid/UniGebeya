import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, PieChart as PieChartIcon, BarChart2, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface BusinessAnalyticsProps {
  shop: any;
}

export function BusinessAnalytics({ shop }: BusinessAnalyticsProps) {
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['shop-analytics', shop.id],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at')
        .eq('shop_id', shop.id);

      if (error) throw error;
      return orders;
    },
    enabled: !!shop.id,
  });

  const stats = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return {
        totalOrders: 0,
        delivered: 0,
        cancelled: 0,
        averageOrderValue: 0,
        statusData: [],
      };
    }

    let deliveredCount = 0;
    let cancelledCount = 0;
    let totalRevenue = 0;

    const statusCounts: Record<string, number> = {};

    analyticsData.forEach(order => {
      const status = order.status;
      if (status === 'delivered') {
        deliveredCount++;
        totalRevenue += (order.total_amount || 0);
      } else if (status === 'cancelled') {
        cancelledCount++;
      }

      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusData = Object.keys(statusCounts).map(key => ({
      name: key.replace('_', ' ').toUpperCase(),
      value: statusCounts[key]
    }));

    return {
      totalOrders: analyticsData.length,
      delivered: deliveredCount,
      cancelled: cancelledCount,
      averageOrderValue: deliveredCount > 0 ? totalRevenue / deliveredCount : 0,
      statusData,
    };
  }, [analyticsData]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6666'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Business Analytics</h2>
        <p className="text-muted-foreground">Deep dive into your shop's performance metrics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageOrderValue.toFixed(2)} ETB</div>
            <p className="text-xs text-muted-foreground">Across delivered orders</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOrders > 0 ? Math.round((stats.delivered / stats.totalOrders) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.delivered} of {stats.totalOrders} orders completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOrders > 0 ? Math.round((stats.cancelled / stats.totalOrders) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.cancelled} cancelled orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Total orders received</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {stats.statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insights & Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold text-sm mb-1 text-primary">Maximize Revenue</h4>
              <p className="text-sm text-muted-foreground">
                Your average order value is {stats.averageOrderValue.toFixed(2)} ETB. Try creating bundle offers or promotions to encourage customers to add more items to their cart.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold text-sm mb-1 text-warning">Reduce Cancellations</h4>
              <p className="text-sm text-muted-foreground">
                You have a {(stats.totalOrders > 0 ? (stats.cancelled / stats.totalOrders) * 100 : 0).toFixed(1)}% cancellation rate. Ensure you are accepting orders quickly and managing your inventory accurately to avoid out-of-stock cancellations.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold text-sm mb-1 text-success">Customer Retention</h4>
              <p className="text-sm text-muted-foreground">
                Maintain high ratings to keep customers coming back. Make sure to review your customer feedback in the Reviews section to identify areas for improvement.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
