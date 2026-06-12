import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Bell, ShoppingBag, Percent, Megaphone, Trash2, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AppNotification {
  id: string;
  type: 'order' | 'promo' | 'system';
  title: string;
  message: string;
  time: string;
  isNew: boolean;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const stored = localStorage.getItem(`student_notifications_${user.id}`);
    if (stored) {
      setNotifications(JSON.parse(stored));
    } else {
      // Seed default notifications
      const defaults: AppNotification[] = [
        {
          id: '1',
          type: 'promo',
          title: '🔥 Campus Discount Code!',
          message: 'Get 15% off printing services using the code PRINT15 on checkout.',
          time: new Date(Date.now() - 3600000 * 2).toISOString(),
          isNew: true,
        },
        {
          id: '2',
          type: 'order',
          title: '✅ Order Delivered Successfully',
          message: 'Your order from Central Cafe was delivered. Rate your runner!',
          time: new Date(Date.now() - 86400000).toISOString(),
          isNew: false,
        },
        {
          id: '3',
          type: 'system',
          title: '📢 System Update: Wallet Added!',
          message: 'You can now deposit money into your Uni Gebeya wallet for instant checkout.',
          time: new Date(Date.now() - 86400000 * 3).toISOString(),
          isNew: false,
        },
      ];
      setNotifications(defaults);
      localStorage.setItem(`student_notifications_${user.id}`, JSON.stringify(defaults));
    }
  }, [user?.id]);

  const saveToStorage = (list: AppNotification[]) => {
    if (!user?.id) return;
    setNotifications(list);
    localStorage.setItem(`student_notifications_${user.id}`, JSON.stringify(list));
  };

  const handleClearAll = () => {
    saveToStorage([]);
    toast.success('Cleared all notifications');
  };

  const handleMarkRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isNew: false } : n));
    saveToStorage(updated);
  };

  const getRelativeTime = (timeStr: string) => {
    const diffMs = Date.now() - new Date(timeStr).getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="w-5 h-5 text-primary" />;
      case 'promo':
        return <Percent className="w-5 h-5 text-success" />;
      case 'system':
        return <Megaphone className="w-5 h-5 text-info" />;
    }
  };

  const getBgClass = (type: AppNotification['type'], isNew: boolean) => {
    let base = isNew ? 'bg-card border-l-4 border-l-primary' : 'bg-card/60 opacity-80';
    return base;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Notifications" showBack />

      <div className="px-4 py-4 max-w-md mx-auto space-y-4">
        {notifications.length > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-muted-foreground">
              {notifications.filter((n) => n.isNew).length} unread
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-destructive hover:bg-destructive/10 text-xs flex items-center gap-1.5 h-8 px-2.5 rounded-xl"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </Button>
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-3xl">
            <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No new notifications received</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif, index) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleMarkRead(notif.id)}
                className={`p-4 rounded-2xl border shadow-card flex gap-3 cursor-pointer transition-all ${getBgClass(
                  notif.type,
                  notif.isNew
                )}`}
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-sm leading-tight">{notif.title}</p>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {getRelativeTime(notif.time)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">{notif.message}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
