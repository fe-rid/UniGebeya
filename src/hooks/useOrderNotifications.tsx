import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const statusMessages: Record<string, Record<string, string>> = {
  student: {
    accepted: '🎉 Your order has been accepted by the shop!',
    picked_up: '🏃 A runner has picked up your order!',
    on_the_way: '🚀 Your order is on the way!',
    delivered: '✅ Your order has been delivered!',
    cancelled: '❌ Your order has been cancelled',
  },
  shopkeeper: {
    pending: '🔔 New order received!',
    picked_up: '🏃 Runner picked up the order',
    delivered: '✅ Order has been delivered',
  },
  runner: {
    accepted: '📦 New delivery available!',
  },
};

export function useOrderNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const userRole = user?.role;

  useEffect(() => {
    if (!user?.id || !userRole) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`order-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          const newOrder = payload.new as any;
          const oldOrder = payload.old as any;
          
          const statusChanged = newOrder.status !== oldOrder.status;
          const ratingAdded = newOrder.runner_rating !== oldOrder.runner_rating && newOrder.runner_rating !== null;
          
          if (!statusChanged && !ratingAdded) return;

          // Check if this notification is relevant to the user
          let shouldNotify = false;
          let message = '';
          let type: 'info' | 'success' | 'error' = 'info';

          if (userRole === 'student' && newOrder.customer_id === user.id) {
            if (statusChanged) {
              shouldNotify = true;
              message = statusMessages.student[newOrder.status] || `Order status: ${newOrder.status}`;
              if (newOrder.status === 'cancelled') type = 'error';
              else if (newOrder.status === 'delivered') type = 'success';
            }
          } else if (userRole === 'shopkeeper') {
            if (statusChanged) {
              // Check if this order belongs to the user's shop
              const { data: shop } = await supabase
                .from('shops')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

              if (shop && newOrder.shop_id === shop.id) {
                shouldNotify = true;
                message = statusMessages.shopkeeper[newOrder.status] || `Order updated: ${newOrder.status}`;
                if (newOrder.status === 'delivered') type = 'success';
              }
            }
          } else if (userRole === 'runner') {
            if (statusChanged) {
              // Notify runners about newly accepted orders
              if (newOrder.status === 'accepted' && !newOrder.runner_id) {
                shouldNotify = true;
                message = statusMessages.runner.accepted;
              }
              // Notify if this is the runner's assigned order
              if (newOrder.runner_id === user.id) {
                shouldNotify = true;
                message = `Order status: ${newOrder.status.replace('_', ' ')}`;
                if (newOrder.status === 'delivered') type = 'success';
              }
            }
            
            if (ratingAdded && newOrder.runner_id === user.id) {
              shouldNotify = true;
              message = `⭐️ You received a ${newOrder.runner_rating}-star rating! ${newOrder.runner_review ? `"${newOrder.runner_review}"` : ''}`;
              type = 'success';
            }
          }

          if (shouldNotify && message) {
            // Show toast based on status type
            if (type === 'error') {
              toast.error(message);
            } else if (type === 'success') {
              toast.success(message);
            } else {
              toast.info(message);
            }

            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ['student-orders'] });
            queryClient.invalidateQueries({ queryKey: ['shop-orders'] });
            queryClient.invalidateQueries({ queryKey: ['shop-dashboard-orders'] });
            queryClient.invalidateQueries({ queryKey: ['available-orders'] });
            queryClient.invalidateQueries({ queryKey: ['runner-active-orders'] });
            queryClient.invalidateQueries({ queryKey: ['runner-notifications', user.id] });
            queryClient.invalidateQueries({ queryKey: ['runner-overall-stats', user.id] });
            queryClient.invalidateQueries({ queryKey: ['runner-earnings'] });
            queryClient.invalidateQueries({ queryKey: ['runner-profile-stats', user.id] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          const newOrder = payload.new as any;

          // Notify shopkeeper about new orders
          if (userRole === 'shopkeeper') {
            const { data: shop } = await supabase
              .from('shops')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();

            if (shop && newOrder.shop_id === shop.id) {
              toast.info('🔔 New order received!');
              queryClient.invalidateQueries({ queryKey: ['shop-orders'] });
              queryClient.invalidateQueries({ queryKey: ['shop-dashboard-orders'] });
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id, userRole, queryClient]);
}
