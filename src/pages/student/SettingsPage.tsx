import { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Shield, Bell, Globe, Key, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const [notifs, setNotifs] = useState({
    orders: true,
    promo: false,
    offers: true,
  });
  const [privacy, setPrivacy] = useState({
    online: true,
    shareStats: false,
  });
  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwords.current || !passwords.newPass || !passwords.confirm) {
      toast.error('All password fields are required');
      return;
    }

    if (passwords.newPass.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (passwords.newPass !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }

    toast.success('Your password has been changed successfully!');
    setPasswords({ current: '', newPass: '', confirm: '' });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Settings" showBack />

      <div className="px-4 py-4 max-w-md mx-auto space-y-6">
        {/* Language Selection */}
        <div className="space-y-3">
          <h2 className="font-bold text-sm text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Globe className="w-4 h-4 text-primary" /> Language Selection
          </h2>

          <div className="p-4 rounded-2xl bg-card border shadow-card grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setLang('en');
                toast.success('Language set to English');
              }}
              className={`py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-between transition-all ${
                lang === 'en'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:bg-muted text-muted-foreground'
              }`}
            >
              <span>English</span>
              {lang === 'en' && <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                setLang('am');
                toast.success('ቋንቋ ወደ አማርኛ ተቀይሯል (Simulated)');
              }}
              className={`py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-between transition-all ${
                lang === 'am'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:bg-muted text-muted-foreground'
              }`}
            >
              <span>አማርኛ (Amharic)</span>
              {lang === 'am' && <Check className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Notifications Preferences */}
        <div className="space-y-3">
          <h2 className="font-bold text-sm text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Bell className="w-4 h-4 text-primary" /> Notifications Toggles
          </h2>

          <div className="p-4 rounded-2xl bg-card border shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Order Status Updates</p>
                <p className="text-xs text-muted-foreground">Receive real-time alerts when orders update</p>
              </div>
              <Switch
                checked={notifs.orders}
                onCheckedChange={(val) => setNotifs({ ...notifs, orders: val })}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="font-semibold text-sm">Promotional Notices</p>
                <p className="text-xs text-muted-foreground">Receive updates on discounts, sales, and codes</p>
              </div>
              <Switch
                checked={notifs.promo}
                onCheckedChange={(val) => setNotifs({ ...notifs, promo: val })}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="font-semibold text-sm">Personalized Offers</p>
                <p className="text-xs text-muted-foreground">Receive suggestions based on your order history</p>
              </div>
              <Switch
                checked={notifs.offers}
                onCheckedChange={(val) => setNotifs({ ...notifs, offers: val })}
              />
            </div>
          </div>
        </div>

        {/* Privacy Preferences */}
        <div className="space-y-3">
          <h2 className="font-bold text-sm text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Shield className="w-4 h-4 text-primary" /> Privacy Settings
          </h2>

          <div className="p-4 rounded-2xl bg-card border shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Active Online Status</p>
                <p className="text-xs text-muted-foreground">Show runner when you are actively tracking orders</p>
              </div>
              <Switch
                checked={privacy.online}
                onCheckedChange={(val) => setPrivacy({ ...privacy, online: val })}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="font-semibold text-sm">Share Order Stats</p>
                <p className="text-xs text-muted-foreground">Contribute anonymous order counts to shop rankings</p>
              </div>
              <Switch
                checked={privacy.shareStats}
                onCheckedChange={(val) => setPrivacy({ ...privacy, shareStats: val })}
              />
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="space-y-3">
          <h2 className="font-bold text-sm text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Key className="w-4 h-4 text-primary" /> Security - Change Password
          </h2>

          <form
            onSubmit={handlePasswordChange}
            className="p-5 rounded-2xl bg-card border shadow-card space-y-4"
          >
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Current Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">New Password</label>
              <Input
                type="password"
                placeholder="At least 6 characters"
                value={passwords.newPass}
                onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Confirm New Password</label>
              <Input
                type="password"
                placeholder="At least 6 characters"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                required
              />
            </div>

            <Button type="submit" variant="gradient" className="w-full h-12">
              Update Password
            </Button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
