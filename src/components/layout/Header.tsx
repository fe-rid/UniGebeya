import {
  ArrowLeft,
  Bell,
  Search,
  MapPin,
  Star,
  MessageSquare,
  Clock,
  Home,
  ShoppingCart,
  Package,
  Wallet,
  User,
  HelpCircle,
  Settings,
  Compass,
  Bike,
  DollarSign,
  BarChart3,
  Coffee,
  ClipboardList,
  Store,
  Menu,
  LogOut,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';

const menuItemsByRole = {
  student: [
    { label: 'Home', path: '/student', icon: Home },
    { label: 'Cart', path: '/student/cart', icon: ShoppingCart },
    { label: 'My Orders', path: '/student/orders', icon: Package },
    { label: 'Notifications', path: '/student/notifications', icon: Bell },
    { label: 'Wallet', path: '/student/wallet', icon: Wallet },
    { label: 'Saved Addresses', path: '/student/addresses', icon: MapPin },
    { label: 'Profile', path: '/student/profile', icon: User },
    { label: 'Help & Support', path: '/student/help', icon: HelpCircle },
    { label: 'Settings', path: '/student/settings', icon: Settings },
  ],
  runner: [
    { label: 'Available Jobs', path: '/runner', icon: Compass },
    { label: 'Active Tasks', path: '/runner/active', icon: Bike },
    { label: 'Earnings', path: '/runner/earnings', icon: DollarSign },
    { label: 'Profile', path: '/runner/profile', icon: User },
  ],
  shopkeeper: [
    { label: 'Dashboard', path: '/shop', icon: BarChart3 },
    { label: 'Products', path: '/shop/products', icon: Coffee },
    { label: 'Orders', path: '/shop/orders', icon: ClipboardList },
    { label: 'Profile', path: '/shop/profile', icon: Store },
  ],
};

function SidebarMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const menuItems = menuItemsByRole[user.role as keyof typeof menuItemsByRole] || [];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl hover:bg-muted"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[80%] sm:max-w-xs p-6 flex flex-col justify-between">
        <div className="space-y-6">
          <SheetHeader className="pb-4 border-b text-left">
            <SheetTitle className="text-left flex items-center gap-2">
              <span className="font-bold text-lg text-primary">Uni Gebeya</span>
            </SheetTitle>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                {user.name[0]}
              </div>
              <div className="truncate">
                <p className="font-semibold text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>
          </SheetHeader>
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                  }}
                  className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-muted text-sm font-semibold transition-colors text-foreground"
                >
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-t pt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-destructive/10 text-sm font-semibold text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showLocation?: boolean;
  showNotification?: boolean;
  transparent?: boolean;
}

export function Header({
  title,
  showBack = false,
  showSearch = false,
  showLocation = false,
  showNotification = false,
  transparent = false,
}: HeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['runner-notifications', user?.id],
    queryFn: async () => {
      if (!user || user.role !== 'runner') return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          runner_rating,
          runner_review,
          updated_at,
          shop:shops(name)
        `)
        .eq('runner_id', user.id)
        .not('runner_rating', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      return (orders || []).map((order: any) => ({
        id: order.id,
        type: 'rating',
        title: 'New Rating Received!',
        description: `You were rated ${order.runner_rating} stars for your delivery from ${order.shop?.name || 'Unknown Shop'}.`,
        rating: order.runner_rating,
        review: order.runner_review,
        time: new Date(order.updated_at),
      }));
    },
    enabled: !!user && user.role === 'runner' && showNotification,
  });

  const [lastSeen, setLastSeen] = React.useState<string>(() => {
    return localStorage.getItem(`runner_notifications_seen_${user?.id}`) || '';
  });

  const hasNewNotifications = React.useMemo(() => {
    if (!notifications || notifications.length === 0) return false;
    if (!lastSeen) return true;
    return new Date(notifications[0].time).getTime() > new Date(lastSeen).getTime();
  }, [notifications, lastSeen]);

  const handleOpenChange = (open: boolean) => {
    if (open && notifications && notifications.length > 0) {
      const newestTime = notifications[0].time.toISOString();
      localStorage.setItem(`runner_notifications_seen_${user?.id}`, newestTime);
      setLastSeen(newestTime);
    }
  };

  React.useEffect(() => {
    if (!user?.id || user.role !== 'runner' || !showNotification) return;

    const channel = supabase
      .channel(`header-runner-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `runner_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.runner_rating !== payload.old.runner_rating) {
            queryClient.invalidateQueries({ queryKey: ['runner-notifications', user.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role, showNotification, queryClient]);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`sticky top-0 z-40 ${transparent ? '' : 'glass border-b'}`}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          {showBack ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <SidebarMenu />
          )}
          
          {showLocation && user?.location && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deliver to</p>
                <p className="text-sm font-semibold truncate max-w-[150px]">
                  {user.location}
                </p>
              </div>
            </div>
          )}

          {title && (
            <h1 className="text-lg font-bold">{title}</h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showSearch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/student/search')}
              className="rounded-xl"
            >
              <Search className="w-5 h-5" />
            </Button>
          )}
          
          {showNotification && (
            <Sheet onOpenChange={handleOpenChange}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl relative"
                >
                  <Bell className="w-5 h-5" />
                  {hasNewNotifications && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[90%] sm:max-w-md p-6">
                <SheetHeader className="pb-4 border-b">
                  <SheetTitle className="text-left flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" /> Notifications
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4 overflow-y-auto max-h-[80vh] pr-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">All caught up!</p>
                      <p className="text-sm">No new ratings or feedback yet.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="p-4 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-warning fill-warning" />
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(notif.time, { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                          {notif.description}
                        </p>
                        {notif.review && (
                          <div className="p-3 rounded-xl bg-muted/50 border border-dashed flex gap-2">
                            <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                            <p className="text-xs text-foreground italic">
                              "{notif.review}"
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </motion.header>
  );
}
