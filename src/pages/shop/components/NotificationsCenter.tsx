import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Bell, ShoppingBag, PackageX, Star, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface NotificationsCenterProps {
  shop: any;
}

type NotificationType = 'order' | 'stock' | 'review' | 'system';

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: Date;
  read: boolean;
}

export function NotificationsCenter({ shop }: NotificationsCenterProps) {
  // We'll synthesize notifications from real data
  const { data: generatedNotifications, isLoading } = useQuery({
    queryKey: ['shop-notifications', shop.id],
    queryFn: async () => {
      const notifications: AppNotification[] = [];

      // 1. Fetch recent orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, created_at, status')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })
        .limit(10);

      recentOrders?.forEach(order => {
        notifications.push({
          id: `order-${order.id}`,
          type: 'order',
          title: `Order Update #${order.id.slice(0, 6)}`,
          message: `Order status is now: ${order.status.replace('_', ' ')}.`,
          time: new Date(order.created_at),
          read: order.status === 'delivered' || order.status === 'cancelled',
        });
      });

      // 2. Fetch low stock products
      const { data: products } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .eq('shop_id', shop.id)
        .lt('stock_quantity', 10);

      products?.forEach(product => {
        notifications.push({
          id: `stock-${product.id}`,
          type: 'stock',
          title: `Low Stock Alert: ${product.name}`,
          message: `You only have ${product.stock_quantity} items left in stock.`,
          time: new Date(), // Just use current time for stock alerts
          read: false,
        });
      });

      // 3. Fetch recent reviews
      const { data: reviews } = await supabase
        .from('orders')
        .select('id, shop_rating, updated_at')
        .eq('shop_id', shop.id)
        .not('shop_rating', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(5);

      reviews?.forEach(review => {
        notifications.push({
          id: `review-${review.id}`,
          type: 'review',
          title: `New Shop Review`,
          message: `A customer left a ${review.shop_rating}-star review for order #${review.id.slice(0, 6)}.`,
          time: new Date(review.updated_at),
          read: true,
        });
      });

      return notifications.sort((a, b) => b.time.getTime() - a.time.getTime());
    },
    enabled: !!shop.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'order': return <ShoppingBag className="w-4 h-4 text-primary" />;
      case 'stock': return <PackageX className="w-4 h-4 text-destructive" />;
      case 'review': return <Star className="w-4 h-4 text-warning" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBgColor = (type: NotificationType) => {
    switch (type) {
      case 'order': return 'bg-primary/10';
      case 'stock': return 'bg-destructive/10';
      case 'review': return 'bg-warning/10';
      default: return 'bg-blue-500/10';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notifications Center</h2>
          <p className="text-muted-foreground">Stay updated on your shop's activity.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!generatedNotifications || generatedNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No new notifications.</p>
              </div>
            ) : (
              generatedNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`flex items-start gap-4 p-4 rounded-lg border ${!notification.read ? 'bg-muted/30 border-primary/20' : 'border-border'}`}
                >
                  <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getBgColor(notification.type)}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-foreground/80'}`}>
                        {notification.title}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {format(notification.time, 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
