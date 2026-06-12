import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, LogOut, Star, Package, DollarSign, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function RunnerProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  // Fetch runner stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['runner-profile-stats', user?.id],
    queryFn: async () => {
      if (!user) return { totalDeliveries: 0, totalEarnings: 0, avgRating: 0.0 };

      const { data: orders, error } = await supabase
        .from('orders')
        .select('delivery_fee, runner_rating')
        .eq('runner_id', user.id)
        .eq('status', 'delivered');

      if (error) throw error;

      const totalDeliveries = orders?.length || 0;
      const totalEarnings = orders?.reduce((sum, o) => sum + Number(o.delivery_fee), 0) || 0;
      
      const ratedOrders = orders?.filter(o => o.runner_rating !== null) || [];
      const avgRating = ratedOrders.length > 0
        ? Number((ratedOrders.reduce((sum, o) => sum + Number(o.runner_rating), 0) / ratedOrders.length).toFixed(1))
        : 0.0;

      return {
        totalDeliveries,
        totalEarnings,
        avgRating,
      };
    },
    enabled: !!user,
  });

  const stats = statsData || {
    totalDeliveries: 0,
    totalEarnings: 0,
    avgRating: 0.0,
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Profile" showNotification />

      <div className="px-4 py-4">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-6 rounded-3xl gradient-runner text-white mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center">
              <User className="w-10 h-10" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{user?.name || 'Runner'}</h2>
              <p className="opacity-80 text-sm">{user?.email}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                <span className="font-semibold">{stats.avgRating === 0 ? '0.0' : stats.avgRating.toFixed(1)}</span>
                <span className="opacity-70 text-sm">({stats.totalDeliveries} deliveries)</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Deliveries', value: stats.totalDeliveries.toString(), icon: Package },
            { label: 'Earned', value: `${stats.totalEarnings} ETB`, icon: DollarSign },
            { label: 'Rating', value: stats.avgRating === 0 ? '0.0' : stats.avgRating.toFixed(1), icon: Star },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className="p-4 rounded-2xl bg-card shadow-card text-center"
            >
              <stat.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Info Section */}
        <div className="space-y-3 mb-6">
          <h3 className="font-semibold text-lg">Personal Information</h3>
          
          <div className="p-4 rounded-2xl bg-card shadow-card space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{user?.phone || 'Not set'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{user?.location || 'Not set'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/20 hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
