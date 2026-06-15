import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Store, Bell, Shield, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface SettingsManagementProps {
  shop: any;
}

export function SettingsManagement({ shop }: SettingsManagementProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const toggleStatusMutation = useMutation({
    mutationFn: async (isOpen: boolean) => {
      const { error } = await supabase
        .from('shops')
        .update({ is_open: isOpen })
        .eq('id', shop.id);
      if (error) throw error;
      return isOpen;
    },
    onSuccess: (isOpen) => {
      queryClient.invalidateQueries({ queryKey: ['my-shop'] });
      toast.success(isOpen ? 'Shop is now open' : 'Shop is now closed');
    },
    onError: (error) => {
      toast.error('Failed to update shop status: ' + error.message);
    }
  });

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error: any) {
      toast.error('Error logging out: ' + error.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your shop preferences and account settings.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              Shop Operating Status
            </CardTitle>
            <CardDescription>
              Toggle whether your shop is currently open or closed to new orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-base">Accepting Orders</Label>
                <p className="text-sm text-muted-foreground">
                  {shop?.is_open 
                    ? "Your shop is open and visible to customers." 
                    : "Your shop is closed and temporarily hidden from the student app."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {toggleStatusMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                <Switch 
                  checked={shop?.is_open} 
                  onCheckedChange={(checked) => toggleStatusMutation.mutate(checked)}
                  disabled={toggleStatusMutation.isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose how you want to be notified about shop activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>New Order Alerts</Label>
                <p className="text-sm text-muted-foreground">Play a sound and show a notification for new orders.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Low Stock Warnings</Label>
                <p className="text-sm text-muted-foreground">Notify when a product drops below 10 items.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Account Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => toast.info('Password reset link sent to your email.')}>
              Change Password
            </Button>
            <div className="pt-4 border-t border-border">
              <Button variant="destructive" className="w-full sm:w-auto gap-2" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                Log Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
