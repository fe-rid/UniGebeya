import { motion } from 'framer-motion';
import { LogOut, ChevronRight, MapPin, Phone, Mail, Edit2, Bell, Shield, HelpCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const menuItems = [
  { icon: MapPin, label: 'My Addresses', path: '/student/addresses' },
  { icon: Bell, label: 'Notifications', path: '/student/notifications' },
  { icon: Shield, label: 'Privacy & Security', path: '/student/privacy' },
  { icon: HelpCircle, label: 'Help & Support', path: '/student/help' },
];

export default function StudentProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Profile" />

      <div className="px-4 py-4">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-6 rounded-2xl gradient-primary text-primary-foreground mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/20"
          >
            <Edit2 className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-4">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
              alt={user?.name}
              className="w-20 h-20 rounded-2xl bg-white/20"
            />
            <div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-sm opacity-80">Student</p>
              {user?.isVerified && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                  <Shield className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20 space-y-2">
            <div className="flex items-center gap-2 text-sm opacity-80">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm opacity-80">
              <Phone className="w-4 h-4" />
              <span>{user?.phone || 'Add phone number'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm opacity-80">
              <MapPin className="w-4 h-4" />
              <span>{user?.location || 'Add address'}</span>
            </div>
          </div>
        </motion.div>

        {/* Menu Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card shadow-card overflow-hidden mb-6"
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-4 p-4 hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="flex-1 text-left font-medium">{item.label}</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            );
          })}
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant="outline"
            size="lg"
            onClick={handleLogout}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Log Out
          </Button>
        </motion.div>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Uni Gebeya v1.0.0
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
