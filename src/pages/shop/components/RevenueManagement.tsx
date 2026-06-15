import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, DollarSign, TrendingUp, Calendar, CreditCard } from 'lucide-react';
import { format, subDays, isSameDay, startOfWeek, isSameWeek } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RevenueManagementProps {
  shop: any;
}

export function RevenueManagement({ shop }: RevenueManagementProps) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['shop-revenue', shop.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!shop.id,
  });

  const { totalRevenue, todayRevenue, weeklyRevenue, chartData } = useMemo(() => {
    if (!orders) return { totalRevenue: 0, todayRevenue: 0, weeklyRevenue: 0, chartData: [] };

    const today = new Date();
    let total = 0;
    let todayTotal = 0;
    let weeklyTotal = 0;

    // Initialize past 7 days data
    const dailyData = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(today, 6 - i);
      return {
        date,
        dayName: format(date, 'EEE'),
        revenue: 0,
      };
    });

    orders.forEach((order) => {
      const orderDate = new Date(order.created_at);
      const amount = order.total_amount || 0;

      total += amount;

      if (isSameDay(orderDate, today)) {
        todayTotal += amount;
      }

      if (isSameWeek(orderDate, today)) {
        weeklyTotal += amount;
      }

      // Add to chart data if within last 7 days
      const diffTime = Math.abs(today.getTime() - orderDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        const dayMatch = dailyData.find((d) => isSameDay(d.date, orderDate));
        if (dayMatch) {
          dayMatch.revenue += amount;
        }
      }
    });

    return {
      totalRevenue: total,
      todayRevenue: todayTotal,
      weeklyRevenue: weeklyTotal,
      chartData: dailyData,
    };
  }, [orders]);

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
        <h2 className="text-3xl font-bold tracking-tight">Revenue Management</h2>
        <p className="text-muted-foreground">Monitor your earnings and financial performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toFixed(2)} ETB</div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayRevenue.toFixed(2)} ETB</div>
            <p className="text-xs text-muted-foreground">Earnings today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyRevenue.toFixed(2)} ETB</div>
            <p className="text-xs text-muted-foreground">Earnings this week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dayName" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="revenue" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-success" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {orders?.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center">
                  <div className="p-2 bg-success/10 rounded-full mr-4">
                    <CreditCard className="h-4 w-4 text-success" />
                  </div>
                  <div className="ml-4 space-y-1 flex-1">
                    <p className="text-sm font-medium leading-none">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(order.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <div className="font-medium">+{order.total_amount?.toFixed(2)} ETB</div>
                </div>
              ))}
              {orders?.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No recent transactions.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
