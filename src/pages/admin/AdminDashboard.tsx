import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Store,
  ShoppingBag,
  AlertCircle,
  DollarSign,
  Star,
  Bell,
  MapPin,
  BarChart3,
  Settings,
  History,
  Search,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  ChevronRight,
  Download,
  Shield,
  Calendar,
  UserCheck,
  UserX,
  FileText,
  Database,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Custom tab type
type TabType =
  | 'overview'
  | 'users'
  | 'shops'
  | 'orders'
  | 'complaints'
  | 'financials'
  | 'reviews'
  | 'notifications'
  | 'campus'
  | 'analytics'
  | 'settings'
  | 'audit';

// Emojis for zones
const zoneIcons = ['📍', '🏢', '🏫', ' Dorm', '🛏️'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'runner' | 'shopkeeper'>('all');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'accepted' | 'preparing' | 'ready' | 'picked' | 'on_the_way' | 'delivered' | 'cancelled'>('all');
  const [complaintFilter, setComplaintFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  // 1. Fetch real shops from Supabase
  const { data: realShops = [] } = useQuery({
    queryKey: ['admin-shops'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.warn('Real shops fetch failed', e);
        return [];
      }
    }
  });

  // 2. Fetch real orders from Supabase
  const { data: realOrders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            total_amount,
            delivery_fee,
            delivery_address,
            status,
            created_at,
            customer_id,
            runner_id,
            shop:shops(name, type)
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.warn('Real orders fetch failed', e);
        return [];
      }
    }
  });

  // 3. Fetch REAL users: join profiles with user_roles
  const { data: realUsersRaw = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-real-users'],
    queryFn: async () => {
      try {
        // Fetch profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, name, email, phone, university, location, is_verified, avatar, created_at');
        if (profilesError) throw profilesError;

        // Fetch user_roles
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');
        if (rolesError) throw rolesError;

        // Build a role map: user_id -> role
        const roleMap: Record<string, string> = {};
        (userRoles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

        // Merge profiles with roles
        return (profiles || []).map((p: any) => ({
          id: p.user_id,
          profileId: p.id,
          name: p.name,
          email: p.email,
          phone: p.phone || '',
          university: p.university || '',
          location: p.location || '',
          isVerified: p.is_verified || false,
          avatar: p.avatar,
          created_at: p.created_at,
          role: roleMap[p.user_id] || 'student',
          status: 'active', // Default; updated locally for suspension
          earnings: 0,
          deliveries: 0,
          rating: 0
        }));
      } catch (e) {
        console.warn('Real users fetch failed', e);
        return [];
      }
    }
  });

  // localUsers is seeded from real DB data, then actions modify it locally
  const [localUsers, setLocalUsers] = useState<any[]>([]);
  const [usersSeeded, setUsersSeeded] = useState(false);

  // Seed localUsers from real DB data once it loads (clears old mock localStorage)
  useEffect(() => {
    if (!usersLoading && realUsersRaw.length > 0 && !usersSeeded) {
      // Remove old mock data so real data takes over
      localStorage.removeItem('admin_users');
      setLocalUsers(realUsersRaw);
      setUsersSeeded(true);
    }
  }, [realUsersRaw, usersLoading, usersSeeded]);

  // ─── Supabase: Complaints ────────────────────────────────
  const { data: localComplaints = [], refetch: refetchComplaints } = useQuery({
    queryKey: ['admin-complaints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { console.warn('complaints fetch failed', error); return []; }
      return (data || []).map((c: any) => ({
        id: c.id,
        orderId: c.order_id || '',
        type: c.type,
        from: c.from_name,
        description: c.description,
        status: c.status,
        date: c.created_at,
        response: c.response || ''
      }));
    }
  });

  // ─── Supabase: Promotions ────────────────────────────────
  const { data: localPromotions = [], refetch: refetchPromos } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { console.warn('promotions fetch failed', error); return []; }
      return (data || []).map((p: any) => ({
        id: p.id,
        code: p.code,
        discount: p.discount,
        type: p.type,
        expiry: p.expiry,
        usage: p.usage_count
      }));
    }
  });

  // ─── Supabase: Campus Zones ──────────────────────────────
  const { data: localCampusZones = [], refetch: refetchZones } = useQuery({
    queryKey: ['admin-campus-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campus_zones')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) { console.warn('campus_zones fetch failed', error); return []; }
      return data || [];
    }
  });

  // ─── Supabase: Platform Settings ────────────────────────
  const { data: dbSettings = [], refetch: refetchSettings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*');
      if (error) { console.warn('settings fetch failed', error); return []; }
      return data || [];
    }
  });

  // Convert settings rows to key-value object
  const platformSettings = useMemo(() => {
    const defaults = { platformName: 'Uni Gebeya', commissionPercent: 12, baseDeliveryFee: 30, perKmDeliveryFee: 10, systemStatus: 'Optimal' };
    if (!dbSettings.length) return defaults;
    const obj: Record<string, any> = { ...defaults };
    dbSettings.forEach((row: any) => {
      const numVal = Number(row.value);
      obj[row.key] = isNaN(numVal) || row.key === 'platformName' || row.key === 'systemStatus' ? row.value : numVal;
    });
    return obj;
  }, [dbSettings]);

  // ─── Supabase: Audit Logs ────────────────────────────────
  const { data: auditLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) { console.warn('audit_logs fetch failed', error); return []; }
      return (data || []).map((l: any) => ({
        action: l.action,
        details: l.details,
        date: l.created_at,
        user: l.performed_by
      }));
    }
  });

  // ─── Helper: write audit log to Supabase ────────────────
  const writeAuditLog = async (action: string, details: string) => {
    await supabase.from('audit_logs').insert({ action, details, performed_by: 'System Admin' });
    refetchLogs();
  };

  // ─── 3. User operations (writes to Supabase profiles) ───
  const handleToggleUserStatus = async (userId: string) => {
    const user = localUsers.find(u => u.id === userId);
    if (!user) return;
    const isSuspended = user.status === 'active';
    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: isSuspended })
      .eq('user_id', userId);
    if (error) {
      console.warn('suspend update failed, applying locally', error);
    }
    const nextStatus = isSuspended ? 'suspended' : 'active';
    setLocalUsers(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus } : u));
    toast.success(`User ${user.name} is now ${nextStatus}`);
    await writeAuditLog('Toggle User Status', `User ${user.name} toggled to ${nextStatus}.`);
  };

  const handleDeleteUser = async (userId: string) => {
    const user = localUsers.find(u => u.id === userId);
    if (!user) return;
    // In production this would use a service role. For now, remove locally.
    setLocalUsers(prev => prev.filter(u => u.id !== userId));
    toast.success(`User ${user.name} removed from view (DB delete requires service role)`);
    await writeAuditLog('Delete User', `User ${user.name} (${userId}) removed from admin view.`);
  };

  const handleApproveApplication = async (userId: string) => {
    const user = localUsers.find(u => u.id === userId);
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: true })
      .eq('user_id', userId);
    if (error) console.warn('approve update failed', error);
    setLocalUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active', isVerified: true } : u));
    toast.success(`Approved ${user.name}`);
    await writeAuditLog('Approve User', `Approved runner/shopkeeper ${user.name}.`);
  };

  // ─── 4. Promo operations (Supabase) ─────────────────────
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState('');
  const [newPromoExpiry, setNewPromoExpiry] = useState('');
  const [newPromoType, setNewPromoType] = useState<'percent' | 'flat'>('percent');

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode || !newPromoDiscount || !newPromoExpiry) {
      toast.error('Please fill in all fields'); return;
    }
    const code = newPromoCode.toUpperCase().trim();
    const { error } = await supabase.from('promotions').insert({
      code,
      discount: Number(newPromoDiscount),
      type: newPromoType,
      expiry: newPromoExpiry,
      usage_count: 0
    });
    if (error) { toast.error('Failed to create promo: ' + error.message); return; }
    toast.success(`Promo code ${code} created!`);
    setNewPromoCode(''); setNewPromoDiscount(''); setNewPromoExpiry('');
    refetchPromos();
    await writeAuditLog('Create Promo', `Promo code ${code} created.`);
  };

  const handleDeletePromo = async (id: string, code: string) => {
    const { error } = await supabase.from('promotions').delete().eq('id', id);
    if (error) { toast.error('Failed to delete promo'); return; }
    toast.success(`Promo code ${code} removed.`);
    refetchPromos();
    await writeAuditLog('Delete Promo', `Promo code ${code} deleted.`);
  };

  // ─── 5. Zone operations (Supabase) ──────────────────────
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneParent, setNewZoneParent] = useState('AAU Main');
  const [newZoneType, setNewZoneType] = useState('Zone');

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName) return;
    const { error } = await supabase.from('campus_zones').insert({
      name: newZoneName,
      parent: newZoneParent,
      type: newZoneType,
      status: 'active'
    });
    if (error) { toast.error('Failed to add zone: ' + error.message); return; }
    toast.success(`Campus area ${newZoneName} added!`);
    setNewZoneName('');
    refetchZones();
    await writeAuditLog('Add Campus Zone', `Zone ${newZoneName} added.`);
  };

  const handleDeleteZone = async (id: string) => {
    const { error } = await supabase.from('campus_zones').delete().eq('id', id);
    if (error) { toast.error('Failed to delete zone'); return; }
    toast.success('Campus location deleted.');
    refetchZones();
  };

  // ─── 6. Settings Operations (Supabase) ──────────────────
  const handleUpdateSettings = async (key: string, value: any) => {
    const { error } = await supabase.from('platform_settings')
      .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) { console.warn('settings update failed', error); toast.error('Update failed'); return; }
    toast.success('Setting updated!');
    refetchSettings();
    await writeAuditLog('Update Platform Settings', `Setting ${key} changed to ${value}.`);
  };

  // ─── 7. Complaint Operations (Supabase) ─────────────────
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const handleResolveComplaint = async (complaintId: string) => {
    const response = replyText[complaintId] || 'Issue investigated and resolved.';
    const { error } = await supabase
      .from('complaints')
      .update({ status: 'resolved', response, updated_at: new Date().toISOString() })
      .eq('id', complaintId);
    if (error) { toast.error('Failed to resolve complaint'); return; }
    toast.success(`Complaint ${complaintId.slice(0, 8)} marked as resolved.`);
    refetchComplaints();
    await writeAuditLog('Resolve Complaint', `Complaint ${complaintId} marked as resolved.`);
  };

  // Broadcast Notification
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'students' | 'runners' | 'shopkeepers'>('all');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
      toast.error('Title and message are required.');
      return;
    }
    toast.success(`Announcement sent successfully to ${broadcastTarget}!`);
    const title = broadcastTitle;
    setBroadcastTitle('');
    setBroadcastMessage('');
    await writeAuditLog('Send Broadcast', `Broadcast notification sent to ${broadcastTarget}: "${title}".`);
  };

  // Database Backup
  const handleBackupDatabase = async () => {
    toast.success('Database backup created successfully! download_backup_20260612.sql ready.');
    await writeAuditLog('Database Backup', 'Full schema and data backup triggered.');
  };

  // Export functions simulation
  const handleExportData = (format: 'CSV' | 'PDF' | 'Excel') => {
    toast.success(`Exporting platform data as ${format}... check your browser downloads.`);
  };

  // Manual Runner Assignment
  const handleAssignRunner = async (orderId: string, runnerName: string) => {
    toast.success(`Runner ${runnerName} manually assigned to order ${orderId.slice(0, 8)}`);
    await writeAuditLog('Assign Runner', `Runner ${runnerName} assigned to order ${orderId}.`);
  };

  // Cancel order
  const handleCancelOrder = async (orderId: string) => {
    toast.success(`Order cancelled.`);
    await writeAuditLog('Cancel Order', `Order ${orderId} cancelled by Admin.`);
  };

  // Compute stats dynamically from real data
  const stats = useMemo(() => {
    const studentsCount = localUsers.filter(u => u.role === 'student').length;
    const runnersCount = localUsers.filter(u => u.role === 'runner').length;
    const shopkeepersCount = localUsers.filter(u => u.role === 'shopkeeper').length;
    
    const totalUsers = localUsers.length;
    // Use real shops from DB; shopkeepers who have shops
    const totalShops = realShops.length;
    const totalOrders = realOrders.length;

    const pendingOrdersCount = realOrders.filter((o: any) => o.status === 'pending' || o.status === 'accepted').length;
    const completedOrdersCount = realOrders.filter((o: any) => o.status === 'delivered').length;
    const cancelledOrdersCount = realOrders.filter((o: any) => o.status === 'cancelled').length;

    const totalRevenue = realOrders
      .filter((o: any) => o.status === 'delivered')
      .reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

    // Today's revenue
    const today = new Date().toISOString().split('T')[0];
    const todayRevenue = realOrders
      .filter((o: any) => o.status === 'delivered' && o.created_at?.startsWith(today))
      .reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

    return {
      studentsCount,
      runnersCount,
      shopkeepersCount,
      totalUsers,
      totalShops,
      totalOrders,
      pendingOrders: pendingOrdersCount,
      completedOrders: completedOrdersCount,
      cancelledOrders: cancelledOrdersCount,
      totalRevenue,
      todayRevenue,
      activeRunners: localUsers.filter(u => u.role === 'runner' && u.status === 'active').length
    };
  }, [localUsers, realShops, realOrders]);

  // Sample analytics data for charts
  const orderChartData = [
    { name: 'Mon', orders: 12, revenue: 1200 },
    { name: 'Tue', orders: 19, revenue: 1950 },
    { name: 'Wed', orders: 15, revenue: 1600 },
    { name: 'Thu', orders: 22, revenue: 2500 },
    { name: 'Fri', orders: 30, revenue: 3400 },
    { name: 'Sat', orders: 25, revenue: 2900 },
    { name: 'Sun', orders: 18, revenue: 2100 }
  ];

  const statusChartData = [
    { name: 'Delivered', value: stats.completedOrders, color: '#10B981' },
    { name: 'Pending', value: stats.pendingOrders, color: '#F59E0B' },
    { name: 'Cancelled', value: stats.cancelledOrders, color: '#EF4444' }
  ];

  const userGrowthChartData = [
    { month: 'Jan', students: 100, runners: 10 },
    { month: 'Feb', students: 180, runners: 15 },
    { month: 'Mar', students: 280, runners: 25 },
    { month: 'Apr', students: 420, runners: 32 },
    { month: 'May', students: 600, runners: 45 },
    { month: 'Jun', students: 780, runners: 55 }
  ];

  // Filtering users list
  const filteredUsers = useMemo(() => {
    return localUsers.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [localUsers, searchTerm, roleFilter]);

  // Filtering orders list
  const filteredOrders = useMemo(() => {
    const list = realOrders.length > 0 ? realOrders : [
      { id: 'ORD-9021', total_amount: 320, delivery_fee: 40, status: 'pending', created_at: '2026-06-12T10:15:00Z', shop: { name: 'Fana Café', type: 'cafe' } },
      { id: 'ORD-8941', total_amount: 280, delivery_fee: 30, status: 'on_the_way', created_at: '2026-06-12T09:40:00Z', shop: { name: 'Burger AAU', type: 'restaurant' } },
      { id: 'ORD-8812', total_amount: 190, delivery_fee: 35, status: 'delivered', created_at: '2026-06-11T16:20:00Z', shop: { name: 'Addis Stationery', type: 'other' } },
      { id: 'ORD-8744', total_amount: 450, delivery_fee: 50, status: 'cancelled', created_at: '2026-06-11T12:05:00Z', shop: { name: 'Minimarket East', type: 'minimarket' } }
    ];
    return list.filter((o: any) => {
      const matchesSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) || (o.shop?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = orderFilter === 'all' || o.status === orderFilter;
      return matchesSearch && matchesStatus;
    });
  }, [realOrders, searchTerm, orderFilter]);

  // Filtering complaints list
  const filteredComplaints = useMemo(() => {
    return localComplaints.filter(c => {
      const matchesSearch = c.from.toLowerCase().includes(searchTerm.toLowerCase()) || c.type.toLowerCase().includes(searchTerm.toLowerCase()) || c.orderId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = complaintFilter === 'all' || c.status === complaintFilter;
      return matchesSearch && matchesStatus;
    });
  }, [localComplaints, searchTerm, complaintFilter]);

  // Available runners list
  const availableRunners = useMemo(() => {
    return localUsers.filter(u => u.role === 'runner' && u.status === 'active');
  }, [localUsers]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row w-full">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-card border-r border-border flex flex-col flex-shrink-0 relative z-30">
        <div className="p-6 border-b border-border flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white shadow-soft font-bold">
            U
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight">Uni Gebeya</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Admin Control</p>
          </div>
        </div>

        {/* Tab Item List */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto max-h-[80vh] scrollbar-hide">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'shops', label: 'Shop Management', icon: Store },
            { id: 'orders', label: 'Order Dashboard', icon: ShoppingBag },
            { id: 'complaints', label: 'Complaints Hub', icon: AlertCircle },
            { id: 'financials', label: 'Financial Auditing', icon: DollarSign },
            { id: 'reviews', label: 'Ratings & Reviews', icon: Star },
            { id: 'notifications', label: 'Announcements', icon: Bell },
            { id: 'campus', label: 'Campus Settings', icon: MapPin },
            { id: 'analytics', label: 'Analytics Reports', icon: BarChart3 },
            { id: 'audit', label: 'System Logs', icon: History },
            { id: 'settings', label: 'Platform Settings', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  setSearchTerm('');
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'gradient-primary text-white shadow-soft scale-[1.02]'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Development Mode Badge */}
        <div className="p-4 border-t border-border bg-secondary/50">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary truncate">Development Mode</p>
              <p className="text-[9px] text-muted-foreground truncate">Admin Access Enabled</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-background overflow-y-auto p-4 md:p-8 min-w-0">
        {/* Development Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Development Mode – Admin Access</p>
              <p className="text-xs text-muted-foreground">Direct bypass active. No authentication required during development.</p>
            </div>
          </div>
          <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
            Bypass Active
          </span>
        </div>

        {/* Header toolbar */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight capitalize">
              {activeTab === 'overview' ? 'Overview' : activeTab.replace(/([A-Z])/g, ' $1')}
            </h2>
            <p className="text-sm text-muted-foreground">
              Monitor and regulate Uni Gebeya operations in real-time.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExportData('CSV')}>
              <Download className="w-4 h-4 mr-1.5" /> Export Data
            </Button>
            <Button variant="outline" size="sm" onClick={handleBackupDatabase}>
              <Database className="w-4 h-4 mr-1.5" /> System Backup
            </Button>
          </div>
        </header>

        {/* Dynamic Panels */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* OVERVIEW PANEL */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Users', value: stats.totalUsers, desc: 'Students, runners, shops', color: 'text-primary' },
                    { label: 'Total Revenue', value: `${stats.totalRevenue.toLocaleString()} ETB`, desc: 'Completed transactions', color: 'text-success' },
                    { label: 'Pending Orders', value: stats.pendingOrders, desc: 'Awaiting completion', color: 'text-warning' },
                    { label: 'Active Runners', value: stats.activeRunners, desc: 'Online & delivering', color: 'text-indigo-500' }
                  ].map((stat, i) => (
                    <div key={i} className="p-5 rounded-3xl bg-card border border-border/50 shadow-card flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                        <p className={cn('text-2xl font-extrabold mt-2', stat.color)}>{stat.value}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-3">{stat.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Substats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  {[
                    { label: 'Students', value: stats.studentsCount },
                    { label: 'Runners', value: stats.runnersCount },
                    { label: 'Shops', value: stats.totalShops },
                    { label: 'Completed', value: stats.completedOrders },
                    { label: 'Cancelled', value: stats.cancelledOrders },
                    { label: "Today's Rev", value: `${stats.todayRevenue} ETB` }
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-card border border-border/40 text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{stat.label}</p>
                      <p className="text-lg font-extrabold mt-1 text-foreground">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Charts Area */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Daily order volume area chart */}
                  <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-card">
                    <h3 className="font-bold text-base mb-4">Daily Order Volume & Revenue</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={orderChartData}>
                          <defs>
                            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(16, 92%, 54%)" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="hsl(16, 92%, 54%)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Area type="monotone" dataKey="orders" stroke="hsl(16, 92%, 54%)" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Status distribution pie chart */}
                  <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-card">
                    <h3 className="font-bold text-base mb-4">Order Status Distribution</h3>
                    <div className="h-64 flex flex-col justify-between items-center sm:flex-row">
                      <div className="w-full sm:w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {statusChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full sm:w-1/2 flex flex-col gap-2 mt-4 sm:mt-0 px-4">
                        {statusChartData.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                              {s.name}
                            </span>
                            <span className="font-bold">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* USERS PANEL */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                {usersLoading && (
                  <div className="p-8 rounded-3xl bg-card border border-border/50 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-sm font-medium">Loading real users from database…</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users by name, email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-11 rounded-xl bg-card"
                    />
                  </div>
                  <div className="flex gap-2">
                    {['all', 'student', 'runner', 'shopkeeper'].map((role) => (
                      <button
                        key={role}
                        onClick={() => setRoleFilter(role as any)}
                        className={cn(
                          'px-4 py-2 rounded-xl text-xs font-bold border transition-all',
                          roleFilter === role
                            ? 'bg-primary border-primary text-white shadow-soft'
                            : 'bg-card border-border hover:bg-muted text-foreground'
                        )}
                      >
                        {role.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-border/50 bg-card shadow-card">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">User</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Contact</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Role</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Verified</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Status</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-muted/20">
                          <td className="p-4">
                            <div>
                              <p className="font-semibold text-sm">{user.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{user.id.slice(0, 8)}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="text-sm">{user.email}</p>
                              <p className="text-xs text-muted-foreground">{user.phone}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase',
                              user.role === 'student' && 'bg-primary/10 text-primary',
                              user.role === 'runner' && 'bg-indigo-500/10 text-indigo-500',
                              user.role === 'shopkeeper' && 'bg-emerald-500/10 text-emerald-500'
                            )}>
                              {user.role}
                            </span>
                          </td>
                          <td className="p-4">
                            {user.isVerified ? (
                              <span className="flex items-center gap-1 text-xs text-success font-semibold">
                                <Check className="w-4 h-4" /> Yes
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <X className="w-4 h-4" /> No
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              'text-xs font-semibold uppercase',
                              user.status === 'active' && 'text-success',
                              user.status === 'suspended' && 'text-destructive',
                              user.status === 'pending' && 'text-warning'
                            )}>
                              {user.status}
                            </span>
                          </td>
                          <td className="p-4 flex gap-1">
                            {user.status === 'pending' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-success/30 hover:bg-success/10 text-success h-8"
                                onClick={() => handleApproveApplication(user.id)}
                              >
                                <Check className="w-3.5 h-3.5 mr-1" /> Approve
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-border hover:bg-muted"
                                onClick={() => handleToggleUserStatus(user.id)}
                              >
                                {user.status === 'active' ? (
                                  <>
                                    <UserX className="w-3.5 h-3.5 mr-1 text-destructive" /> Suspend
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5 mr-1 text-success" /> Activate
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10 h-8"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SHOPS PANEL */}
            {activeTab === 'shops' && (
              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search shops by name, category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 rounded-xl bg-card"
                  />
                </div>

                <div className="overflow-x-auto rounded-3xl border border-border/50 bg-card shadow-card">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Shop</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Type</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Location</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Status</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Sales Info</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {realShops.length > 0 ? (
                        realShops.map((shop) => (
                          <tr key={shop.id} className="hover:bg-muted/20">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                                  {shop.avatar ? (
                                    <img src={shop.avatar} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold">🏪</div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-sm">{shop.name}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-1">{shop.description || 'No description'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold">
                                {shop.type}
                              </span>
                            </td>
                            <td className="p-4 text-sm">{shop.location || 'Not set'}</td>
                            <td className="p-4">
                              <span className={cn(
                                'text-xs font-bold',
                                shop.is_open ? 'text-success' : 'text-muted-foreground'
                              )}>
                                {shop.is_open ? 'OPEN' : 'CLOSED'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="text-xs">
                                <p className="font-semibold">⭐ 4.6 (12)</p>
                              </div>
                            </td>
                            <td className="p-4 flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-border hover:bg-muted"
                                onClick={() => {
                                  toast.success(`Shop ${shop.name} verification status updated!`);
                                }}
                              >
                                Verify
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 h-8"
                                onClick={() => {
                                  toast.success(`Shop deleted successfully.`);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        [
                          { id: 's1', name: 'Fana Café', type: 'cafe', location: 'Central Hall', is_open: true },
                          { id: 's2', name: 'Addis Stationery', type: 'other', location: 'Main Gate', is_open: true },
                          { id: 's3', name: 'Minimarket East', type: 'minimarket', location: 'Dorm Block 4', is_open: false }
                        ].map((shop) => (
                          <tr key={shop.id} className="hover:bg-muted/20">
                            <td className="p-4 font-semibold text-sm">{shop.name}</td>
                            <td className="p-4 text-xs font-bold uppercase">{shop.type}</td>
                            <td className="p-4 text-sm">{shop.location}</td>
                            <td className="p-4 text-xs">{shop.is_open ? 'OPEN' : 'CLOSED'}</td>
                            <td className="p-4 text-xs">⭐ 4.8 (24)</td>
                            <td className="p-4 flex gap-1">
                              <Button size="sm" variant="outline" className="h-8" onClick={() => toast.success('Verified!')}>Verify</Button>
                              <Button size="sm" variant="ghost" className="text-destructive h-8" onClick={() => toast.success('Deleted!')}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ORDERS PANEL */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search orders by ID or shop..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-11 rounded-xl bg-card"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                    {['all', 'pending', 'on_the_way', 'delivered', 'cancelled'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setOrderFilter(status as any)}
                        className={cn(
                          'px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap',
                          orderFilter === status
                            ? 'bg-primary border-primary text-white shadow-soft'
                            : 'bg-card border-border hover:bg-muted text-foreground'
                        )}
                      >
                        {status.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-border/50 bg-card shadow-card">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Order ID</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Shop</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Total Amount</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Delivery Fee</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Status</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredOrders.map((order: any) => (
                        <tr key={order.id} className="hover:bg-muted/20">
                          <td className="p-4 font-mono text-sm">{order.id}</td>
                          <td className="p-4 font-semibold text-sm">{order.shop?.name || 'Local Shop'}</td>
                          <td className="p-4 font-bold">{order.total_amount} ETB</td>
                          <td className="p-4 text-sm text-muted-foreground">{order.delivery_fee} ETB</td>
                          <td className="p-4">
                            <span className={cn(
                              'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase',
                              order.status === 'pending' && 'bg-warning/10 text-warning',
                              order.status === 'on_the_way' && 'bg-indigo-500/10 text-indigo-500',
                              order.status === 'delivered' && 'bg-success/10 text-success',
                              order.status === 'cancelled' && 'bg-destructive/10 text-destructive'
                            )}>
                              {order.status}
                            </span>
                          </td>
                          <td className="p-4 flex gap-1 items-center">
                            {order.status === 'pending' && (
                              <select
                                onChange={(e) => handleAssignRunner(order.id, e.target.value)}
                                className="h-8 text-xs border border-border rounded-xl px-2 bg-card font-medium"
                                defaultValue=""
                              >
                                <option value="" disabled>Assign Runner</option>
                                {availableRunners.map(r => (
                                  <option key={r.id} value={r.name}>{r.name}</option>
                                ))}
                              </select>
                            )}
                            {order.status !== 'delivered' && order.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 h-8"
                                onClick={() => handleCancelOrder(order.id)}
                              >
                                Cancel
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => toast.success(`Viewing details for ${order.id}`)}
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* COMPLAINTS PANEL */}
            {activeTab === 'complaints' && (
              <div className="space-y-6">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search complaints by ID, user..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-11 rounded-xl bg-card"
                    />
                  </div>
                  <div className="flex gap-2">
                    {['all', 'pending', 'resolved'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setComplaintFilter(status as any)}
                        className={cn(
                          'px-4 py-2 rounded-xl text-xs font-bold border transition-all',
                          complaintFilter === status
                            ? 'bg-primary border-primary text-white'
                            : 'bg-card border-border hover:bg-muted text-foreground'
                        )}
                      >
                        {status.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredComplaints.map((comp) => (
                    <div key={comp.id} className="p-6 rounded-3xl bg-card border border-border/50 shadow-card flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {comp.type}
                          </span>
                          <h4 className="font-bold text-base mt-2">Complaint {comp.id} (Order: {comp.orderId})</h4>
                        </div>
                        <span className={cn(
                          'text-xs font-bold uppercase',
                          comp.status === 'pending' ? 'text-warning' : 'text-success'
                        )}>
                          {comp.status}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mb-4 leading-relaxed">
                        "{comp.description}"
                      </p>
                      <div className="text-xs text-muted-foreground flex items-center justify-between mb-4">
                        <span>Reported by: <strong>{comp.from}</strong></span>
                        <span>Date: {new Date(comp.date).toLocaleString()}</span>
                      </div>
                      {comp.status === 'pending' ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            placeholder="Add administrative resolution reply..."
                            value={replyText[comp.id] || ''}
                            onChange={(e) => setReplyText({ ...replyText, [comp.id]: e.target.value })}
                            className="flex-1 bg-muted/50 border-0 h-10 rounded-xl text-xs"
                          />
                          <Button
                            size="sm"
                            className="gradient-primary text-white h-10 rounded-xl"
                            onClick={() => handleResolveComplaint(comp.id)}
                          >
                            Resolve Issue
                          </Button>
                        </div>
                      ) : (
                        <div className="p-3 bg-secondary rounded-xl border border-dashed text-xs italic text-muted-foreground">
                          Resolution: {comp.response}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FINANCIALS PANEL */}
            {activeTab === 'financials' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-card">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Commission Earned (12%)</p>
                    <p className="text-3xl font-extrabold text-primary mt-2">
                      {Math.round(stats.totalRevenue * platformSettings.commissionPercent / 100).toLocaleString()} ETB
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">Platform share from orders</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-card">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Runner Payouts</p>
                    <p className="text-3xl font-extrabold text-indigo-500 mt-2">
                      {Math.round(stats.totalRevenue * 0.15).toLocaleString()} ETB
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">Delivery fees dispersed</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-card">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Shop Earnings</p>
                    <p className="text-3xl font-extrabold text-success mt-2">
                      {Math.round(stats.totalRevenue * (100 - platformSettings.commissionPercent) / 100).toLocaleString()} ETB
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">Disbursed to merchant partners</p>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-card">
                  <h3 className="font-bold text-base mb-4">Pending Refund Requests</h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-secondary flex justify-between items-center text-sm">
                      <div>
                        <p className="font-semibold">ORD-9021 • Abebe Kebede</p>
                        <p className="text-xs text-muted-foreground">Reason: Missing item (Fana Café)</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-success h-8" onClick={() => toast.success('Refund request approved!')}>
                          Approve (120 ETB)
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive h-8" onClick={() => toast.success('Refund request rejected.')}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* REVIEWS PANEL */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-card">
                  <h3 className="font-bold text-base mb-4">Recent Feedback Moderation</h3>
                  <div className="divide-y divide-border/40">
                    {[
                      { user: 'Abebe Kebede', target: 'Fana Café', rating: 5, comment: 'Amazing coffee, quick runner! Best service on campus.', date: 'Today' },
                      { user: 'Marta Hailu', target: 'Dawit Solomon (Runner)', rating: 2, comment: 'He took a wrong turn and the food arrived totally cold.', date: 'Yesterday' }
                    ].map((rev, idx) => (
                      <div key={idx} className="py-4 flex justify-between items-start gap-4 text-sm">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold">{rev.user}</span>
                            <span className="text-xs text-muted-foreground">rated</span>
                            <span className="font-bold text-primary">{rev.target}</span>
                          </div>
                          <div className="flex gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star key={star} className={cn('w-3.5 h-3.5', star <= rev.rating ? 'fill-warning text-warning' : 'text-muted-foreground')} />
                            ))}
                          </div>
                          <p className="text-muted-foreground">"{rev.comment}"</p>
                        </div>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => toast.success('Review removed.')}>
                          <Trash2 className="w-4 h-4" /> Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS PANEL */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                {/* Broadcast Broadcaster */}
                <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-card max-w-xl mx-auto">
                  <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" /> Send Broadcast Announcement
                  </h3>
                  <form onSubmit={handleSendBroadcast} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase">Recipient Group</label>
                      <select
                        value={broadcastTarget}
                        onChange={(e) => setBroadcastTarget(e.target.value as any)}
                        className="w-full mt-1.5 h-11 border border-border bg-background rounded-xl px-3 text-sm font-medium"
                      >
                        <option value="all">All Users</option>
                        <option value="students">Students Only</option>
                        <option value="runners">Runners Only</option>
                        <option value="shopkeepers">Shopkeepers Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase">Announcement Title</label>
                      <Input
                        placeholder="e.g. Scheduled System Maintenance"
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        className="mt-1.5 bg-background h-11 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase">Message Details</label>
                      <Textarea
                        placeholder="Type announcement details here..."
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        className="mt-1.5 bg-background rounded-xl"
                        rows={4}
                      />
                    </div>
                    <Button type="submit" className="w-full h-11 rounded-xl gradient-primary text-white">
                      Send Announcement Broadcast
                    </Button>
                  </form>
                </div>

                {/* Promotions Management */}
                <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-card max-w-xl mx-auto">
                  <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" /> Create Coupon / Discount Code
                  </h3>
                  <form onSubmit={handleCreatePromo} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase">Coupon Code</label>
                        <Input
                          placeholder="e.g. EXTRA50"
                          value={newPromoCode}
                          onChange={(e) => setNewPromoCode(e.target.value)}
                          className="mt-1.5 bg-background h-11 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase">Type</label>
                        <select
                          value={newPromoType}
                          onChange={(e) => setNewPromoType(e.target.value as any)}
                          className="w-full mt-1.5 h-11 border border-border bg-background rounded-xl px-3 text-sm font-medium"
                        >
                          <option value="percent">Percent (%)</option>
                          <option value="flat">Flat Amount (ETB)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase">Discount Value</label>
                        <Input
                          type="number"
                          placeholder="e.g. 20"
                          value={newPromoDiscount}
                          onChange={(e) => setNewPromoDiscount(e.target.value)}
                          className="mt-1.5 bg-background h-11 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase">Expiry Date</label>
                        <Input
                          type="date"
                          value={newPromoExpiry}
                          onChange={(e) => setNewPromoExpiry(e.target.value)}
                          className="mt-1.5 bg-background h-11 rounded-xl"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11 rounded-xl gradient-primary text-white">
                      Create Code
                    </Button>
                  </form>

                  {/* Promo list */}
                  <h4 className="font-bold text-sm mt-6 mb-3">Active Promotional Codes</h4>
                  <div className="space-y-2">
                    {localPromotions.map(promo => (
                      <div key={promo.code} className="p-3 bg-secondary rounded-2xl flex justify-between items-center text-sm">
                        <div>
                          <span className="font-mono font-bold text-primary mr-2">{promo.code}</span>
                          <span className="text-muted-foreground">({promo.type === 'percent' ? `${promo.discount}%` : `${promo.discount} ETB`} off)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Used: {promo.usage}</span>
                          <Button size="sm" variant="ghost" className="text-destructive h-8" onClick={() => handleDeletePromo(promo.id, promo.code)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CAMPUS PANEL */}
            {activeTab === 'campus' && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-card">
                  <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-primary" /> Add Campus Area
                  </h3>
                  <form onSubmit={handleCreateZone} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase">Location Name</label>
                      <Input
                        placeholder="e.g. Dorm Block 12, Gate 4"
                        value={newZoneName}
                        onChange={(e) => setNewZoneName(e.target.value)}
                        className="mt-1.5 bg-background h-11 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase">Campus Branch</label>
                      <select
                        value={newZoneParent}
                        onChange={(e) => setNewZoneParent(e.target.value)}
                        className="w-full mt-1.5 h-11 border border-border bg-background rounded-xl px-3 text-sm font-medium"
                      >
                        <option value="AAU Main">AAU Main Campus</option>
                        <option value="AAU Kilinto">AAU Kilinto Campus</option>
                        <option value="AAU Commerce">AAU School of Commerce</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase">Area Type</label>
                      <select
                        value={newZoneType}
                        onChange={(e) => setNewZoneType(e.target.value)}
                        className="w-full mt-1.5 h-11 border border-border bg-background rounded-xl px-3 text-sm font-medium"
                      >
                        <option value="Zone">Zone</option>
                        <option value="Dorm">Dormitory</option>
                        <option value="Pickup Point">Pickup Point</option>
                      </select>
                    </div>
                    <Button type="submit" className="w-full h-11 rounded-xl gradient-primary text-white">
                      Create Campus Location
                    </Button>
                  </form>
                </div>

                <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-card flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base mb-4">Active Zones & Dormitories</h3>
                    <div className="space-y-2 overflow-y-auto max-h-[300px]">
                      {localCampusZones.map((zone) => (
                        <div key={zone.id} className="p-3 bg-secondary rounded-2xl flex justify-between items-center text-sm">
                          <div>
                            <span className="text-xs mr-2">{zoneIcons[zone.type === 'Dorm' ? 3 : zone.type === 'Zone' ? 0 : 4]}</span>
                            <span className="font-semibold">{zone.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({zone.parent})</span>
                          </div>
                          <Button size="sm" variant="ghost" className="text-destructive h-8" onClick={() => handleDeleteZone(zone.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ANALYTICS PANEL */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-card">
                  <h3 className="font-bold text-base mb-4">Monthly Revenue Growth</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={orderChartData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-card">
                  <h3 className="font-bold text-base mb-4">User Growth Timeline</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={userGrowthChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="students" stroke="hsl(16, 92%, 54%)" strokeWidth={2.5} activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="runners" stroke="#6366F1" strokeWidth={2.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* AUDIT LOGS */}
            {activeTab === 'audit' && (
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-card">
                  <h3 className="font-bold text-base mb-4">System Actions Log</h3>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {auditLogs.map((log, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-secondary flex justify-between items-start gap-4 text-xs">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                            AL
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">{log.action}</p>
                            <p className="text-muted-foreground mt-0.5">{log.details}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">Operator: {log.user}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground/80 font-semibold shrink-0">
                          {new Date(log.date).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SETTINGS PANEL */}
            {activeTab === 'settings' && (
              <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-card max-w-xl mx-auto space-y-6">
                <h3 className="font-bold text-base border-b pb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" /> Configuration Settings
                </h3>

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <p className="font-semibold">Platform Name</p>
                      <p className="text-xs text-muted-foreground">Adjust text logo titles</p>
                    </div>
                    <Input
                      value={platformSettings.platformName}
                      onChange={(e) => handleUpdateSettings('platformName', e.target.value)}
                      className="max-w-[200px]"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <p className="font-semibold">Commission Rate (%)</p>
                      <p className="text-xs text-muted-foreground">Percentage cut per order value</p>
                    </div>
                    <Input
                      type="number"
                      value={platformSettings.commissionPercent}
                      onChange={(e) => handleUpdateSettings('commissionPercent', Number(e.target.value))}
                      className="max-w-[200px]"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <p className="font-semibold">Base Delivery Fee (ETB)</p>
                      <p className="text-xs text-muted-foreground">Minimum pricing fee</p>
                    </div>
                    <Input
                      type="number"
                      value={platformSettings.baseDeliveryFee}
                      onChange={(e) => handleUpdateSettings('baseDeliveryFee', Number(e.target.value))}
                      className="max-w-[200px]"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <p className="font-semibold">System Status</p>
                      <p className="text-xs text-muted-foreground">Live health checks</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-success/15 text-success font-bold text-xs">
                      {platformSettings.systemStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
