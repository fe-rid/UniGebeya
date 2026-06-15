import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, Navigation, Package, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface DeliveryTrackingProps {
  shop: any;
}

export function DeliveryTracking({ shop }: DeliveryTrackingProps) {
  const { data: activeDeliveries, isLoading } = useQuery({
    queryKey: ['shop-deliveries', shop.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          runner:profiles!orders_runner_id_fkey(name, phone)
        `)
        .eq('shop_id', shop.id)
        .in('status', ['picked_up', 'on_the_way'])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!shop.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

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
        <h2 className="text-3xl font-bold tracking-tight">Delivery Tracking</h2>
        <p className="text-muted-foreground">Monitor orders that are currently out for delivery.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(!activeDeliveries || activeDeliveries.length === 0) ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <MapPin className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">No active deliveries</p>
                <p className="text-sm">There are currently no orders out for delivery.</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          activeDeliveries.map((delivery) => (
            <Card key={delivery.id} className="relative overflow-hidden border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">Order #{delivery.id.slice(0, 8)}</CardTitle>
                  <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary uppercase">
                    {delivery.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Updated at {format(new Date(delivery.updated_at), 'h:mm a')}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Navigation className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Delivery Destination</p>
                    <p className="text-sm text-muted-foreground">{delivery.delivery_address || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Assigned Runner</p>
                    <p className="text-sm text-muted-foreground">
                      {/* @ts-ignore */}
                      {delivery.runner?.name || 'Unknown Runner'} 
                      {/* @ts-ignore */}
                      {delivery.runner?.phone ? ` • ${delivery.runner.phone}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Package className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Order Value</p>
                    <p className="text-sm text-success font-semibold">{delivery.total_amount?.toFixed(2)} ETB</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
