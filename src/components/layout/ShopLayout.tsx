import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Boxes,
  DollarSign,
  Users,
  Star,
  Tag,
  Bell,
  Truck,
  BarChart3,
  Store,
  Settings,
  HelpCircle,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface ShopLayoutProps {
  children: React.ReactNode;
  activeSubpage: string;
}

interface Shop {
  id: string;
  name: string;
  is_open: boolean;
  avatar: string | null;
}

export function ShopLayout({ children, activeSubpage }: ShopLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [isMobileOpen, setIsMobileOpen] = useState(false);


  // Fetch shop data
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ['my-shop-layout'],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, is_open, avatar')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Shop | null;
    },
    enabled: !!user,
  });

  // Fetch pending orders count for alert badge
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['layout-pending-orders-count', shop?.id],
    queryFn: async () => {
      if (!shop?.id) return 0;
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!shop?.id,
    refetchInterval: 10000, // Poll every 10 seconds for new orders
  });

  // Toggle open/closed status mutation
  const toggleOpenMutation = useMutation({
    mutationFn: async (isOpen: boolean) => {
      if (!shop?.id) throw new Error('No shop found');
      const { error } = await supabase
        .from('shops')
        .update({ is_open: isOpen })
        .eq('id', shop.id);
      if (error) throw error;
    },
    onSuccess: (_, isOpen) => {
      queryClient.invalidateQueries({ queryKey: ['my-shop-layout'] });
      queryClient.invalidateQueries({ queryKey: ['my-shop'] });
      toast.success(isOpen ? 'Shop is now open' : 'Shop is now closed');
    },
    onError: () => {
      toast.error('Failed to update shop availability');
    },
  });

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/shop' },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, path: '/shop/orders', badge: pendingCount },
    { id: 'products', label: 'Products', icon: Package, path: '/shop/products' },
    { id: 'inventory', label: 'Inventory', icon: Boxes, path: '/shop/inventory' },
    { id: 'revenue', label: 'Revenue', icon: DollarSign, path: '/shop/revenue' },
    { id: 'customers', label: 'Customers', icon: Users, path: '/shop/customers' },
    { id: 'reviews', label: 'Reviews', icon: Star, path: '/shop/reviews' },
    { id: 'promotions', label: 'Promotions', icon: Tag, path: '/shop/promotions' },
    { id: 'tracking', label: 'Delivery Tracking', icon: Truck, path: '/shop/tracking' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/shop/analytics' },
    { id: 'profile', label: 'Shop Profile', icon: Store, path: '/shop/profile' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/shop/notifications' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/shop/settings' },
    { id: 'support', label: 'Help & Support', icon: HelpCircle, path: '/shop/support' },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-card text-card-foreground border-r border-border">
      {/* Brand header */}
      <div className="p-6 flex items-center gap-3 border-b border-border">
        <div className="w-10 h-10 rounded-xl gradient-shop flex items-center justify-center shadow-md">
          <Store className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-lg leading-tight truncate">Uni Gebeya</h1>
          <p className="text-xs text-muted-foreground font-medium">Shop Manager</p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
        {navItems.map((item) => {
          const isActive = activeSubpage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                navigate(item.path);
                setIsMobileOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group text-left",
                isActive 
                  ? "bg-success/10 text-success font-semibold" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn(
                  "w-5 h-5 transition-transform group-hover:scale-105",
                  isActive ? "text-success" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 ? (
                <span className="bg-warning text-white text-xs font-semibold px-2 py-0.5 rounded-full animate-pulse-soft">
                  {item.badge}
                </span>
              ) : (
                <ChevronRight className={cn(
                  "w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all",
                  isActive ? "opacity-100 translate-x-0 text-success" : ""
                )} />
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-border space-y-4 bg-muted/30">
        {/* Availability Switch */}
        {shop && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border/60 shadow-sm">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Shop Availability</p>
              <p className={cn("text-sm font-bold truncate", shop.is_open ? "text-success" : "text-muted-foreground")}>
                {shop.is_open ? "Open & Accepting" : "Closed"}
              </p>
            </div>
            <Switch
              checked={shop.is_open || false}
              disabled={toggleOpenMutation.isPending}
              onCheckedChange={(checked) => toggleOpenMutation.mutate(checked)}
              className="data-[state=checked]:bg-success"
            />
          </div>
        )}

        {/* User Card */}
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border border-border">
            <AvatarImage src={shop?.avatar || ''} />
            <AvatarFallback className="gradient-shop text-white font-bold">
              {shop?.name?.slice(0, 2).toUpperCase() || 'SB'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{shop?.name || user?.name || 'My Shop'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar (Static) */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-20">
        {sidebarContent}
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        {/* Top bar header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 border-b border-border bg-background/80 backdrop-blur-md">
          {/* Left panel */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div className="hidden sm:block text-sm text-muted-foreground">
              Welcome back, <span className="font-semibold text-foreground">{shop?.name || 'Shop owner'}</span>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            {shop && (
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
                shop.is_open 
                  ? "bg-success/10 text-success border border-success/20" 
                  : "bg-muted text-muted-foreground border border-border"
              )}>
                <span className={cn("w-2 h-2 rounded-full", shop.is_open ? "bg-success animate-pulse" : "bg-muted-foreground")} />
                {shop.is_open ? 'Accepting Orders' : 'Offline'}
              </span>
            )}

            {/* Notifications Trigger */}
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-9 h-9 border-border relative"
              onClick={() => navigate('/shop/notifications')}
            >
              <Bell className="w-4 h-4" />
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-warning rounded-full" />
              )}
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar (Hamburger Menu Drawer) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay backdrop */}
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Drawer container */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-card animate-in slide-in-from-left duration-300 shadow-2xl">
            <button
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="h-full">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
