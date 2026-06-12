import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, Mail, Phone, MapPin, LogOut, Edit2, TrendingUp, Coffee, Utensils, ShoppingBag, Sparkles, Package, Check, Loader2, X } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ShopType {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const shopTypes: ShopType[] = [
  { id: 'cafe', label: 'Café / Coffee Shop', description: 'Coffee, tea, juices & light snacks', icon: Coffee },
  { id: 'restaurant', label: 'Restaurant / Kitchen', description: 'Full meals & traditional food', icon: Utensils },
  { id: 'minimarket', label: 'Mini Market / Kiosk', description: 'Snacks, drinks & daily essentials', icon: ShoppingBag },
  { id: 'cosmetics', label: 'Cosmetics & Beauty', description: 'Beauty products & personal care', icon: Sparkles },
  { id: 'other', label: 'Other', description: 'Stationery, electronics, etc.', icon: Package },
];

type ShopTypeId = 'cafe' | 'restaurant' | 'minimarket' | 'cosmetics' | 'other';

interface Shop {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  type: ShopTypeId;
  is_open: boolean;
}

interface ShopStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
}

export default function ShopProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [shop, setShop] = useState<Shop | null>(null);
  const [stats, setStats] = useState<ShopStats>({ totalOrders: 0, totalRevenue: 0, totalProducts: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedShopType, setSelectedShopType] = useState<string | null>(null);
  const [isEditingType, setIsEditingType] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [shopLocation, setShopLocation] = useState('');

  // Fetch shop data and stats from database
  useEffect(() => {
    const fetchShopAndStats = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setShop(data as Shop);
          setSelectedShopType(data.type);
          setShopName(data.name);
          setShopDescription(data.description || '');
          setShopLocation(data.location || '');

          // Fetch order stats
          const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('total_amount, status')
            .eq('shop_id', data.id);

          if (!ordersError && ordersData) {
            const completedOrders = ordersData.filter(o => o.status === 'delivered');
            setStats(prev => ({
              ...prev,
              totalOrders: ordersData.length,
              totalRevenue: completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
            }));
          }

          // Fetch product count
          const { count, error: productsError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', data.id);

          if (!productsError && count !== null) {
            setStats(prev => ({ ...prev, totalProducts: count }));
          }
        }
      } catch (error) {
        console.error('Error fetching shop:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopAndStats();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const handleSelectShopType = async (typeId: string) => {
    if (!user) return;
    
    setSaving(true);
    const selectedType = shopTypes.find(t => t.id === typeId);
    
    try {
      if (shop) {
        // Update existing shop
        const { error } = await supabase
          .from('shops')
          .update({ type: typeId as ShopTypeId })
          .eq('id', shop.id);

        if (error) throw error;

        setShop({ ...shop, type: typeId as ShopTypeId });
      } else {
        // Create new shop
        const { data, error } = await supabase
          .from('shops')
          .insert({
            user_id: user.id,
            name: user.name || 'My Shop',
            type: typeId as ShopTypeId,
          })
          .select()
          .single();

        if (error) throw error;

        setShop(data as Shop);
      }

      setSelectedShopType(typeId);
      toast.success(`Shop type updated to ${selectedType?.label}`);
      setIsEditingType(false);
    } catch (error) {
      console.error('Error saving shop type:', error);
      toast.error('Failed to update shop type');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!user || !shopName.trim()) {
      toast.error('Shop name is required');
      return;
    }
    
    setSaving(true);
    
    try {
      if (shop) {
        const { error } = await supabase
          .from('shops')
          .update({
            name: shopName.trim(),
            description: shopDescription.trim() || null,
            location: shopLocation.trim() || null,
          })
          .eq('id', shop.id);

        if (error) throw error;

        setShop({
          ...shop,
          name: shopName.trim(),
          description: shopDescription.trim() || null,
          location: shopLocation.trim() || null,
        });
      } else {
        const { data, error } = await supabase
          .from('shops')
          .insert({
            user_id: user.id,
            name: shopName.trim(),
            description: shopDescription.trim() || null,
            location: shopLocation.trim() || null,
            type: 'other' as ShopTypeId,
          })
          .select()
          .single();

        if (error) throw error;

        setShop(data as Shop);
        setSelectedShopType(data.type);
      }

      toast.success('Shop details updated');
      setIsEditingDetails(false);
    } catch (error) {
      console.error('Error saving shop details:', error);
      toast.error('Failed to update shop details');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEditDetails = () => {
    setShopName(shop?.name || '');
    setShopDescription(shop?.description || '');
    setShopLocation(shop?.location || '');
    setIsEditingDetails(false);
  };

  const currentShopType = shopTypes.find(t => t.id === selectedShopType);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Shop Profile" showNotification />

      <div className="px-4 py-4">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-6 rounded-3xl gradient-shop text-white mb-6"
        >
          {isEditingDetails ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Edit Shop Details</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={handleCancelEditDetails}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div>
                <label className="text-sm opacity-80 mb-1 block">Shop Name *</label>
                <Input
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Enter shop name"
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                />
              </div>
              <div>
                <label className="text-sm opacity-80 mb-1 block">Description</label>
                <Textarea
                  value={shopDescription}
                  onChange={(e) => setShopDescription(e.target.value)}
                  placeholder="Describe your shop..."
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60 min-h-[80px]"
                />
              </div>
              <div>
                <label className="text-sm opacity-80 mb-1 block">Location</label>
                <Input
                  value={shopLocation}
                  onChange={(e) => setShopLocation(e.target.value)}
                  placeholder="e.g., Student Center, Block A"
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                />
              </div>
              <Button
                onClick={handleSaveDetails}
                disabled={saving}
                className="w-full bg-white text-primary hover:bg-white/90"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Store className="w-10 h-10" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{shop?.name || user?.name || 'My Shop'}</h2>
                  {shop?.description && (
                    <p className="opacity-80 text-sm line-clamp-2">{shop.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <span className="opacity-70 text-sm">{stats.totalOrders} orders</span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20"
                onClick={() => setIsEditingDetails(true)}
              >
                <Edit2 className="w-5 h-5" />
              </Button>
            </>
          )}
        </motion.div>

        {/* Shop Type Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Shop Type</h3>
            {selectedShopType && !isEditingType && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingType(true)}
                className="text-accent"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Change
              </Button>
            )}
          </div>

          {!selectedShopType || isEditingType ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                {selectedShopType ? 'Select a new shop type:' : 'What are you selling?'}
              </p>
              {shopTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedShopType === type.id;

                return (
                  <motion.button
                    key={type.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectShopType(type.id)}
                    disabled={saving}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left",
                      isSelected
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50",
                      saving && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                      isSelected ? "gradient-shop text-white" : "bg-muted"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full gradient-shop flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
              {isEditingType && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setIsEditingType(false)}
                >
                  Cancel
                </Button>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-card shadow-card flex items-center gap-3">
              {currentShopType && (
                <>
                  <div className="w-12 h-12 rounded-xl gradient-shop flex items-center justify-center text-white">
                    <currentShopType.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold">{currentShopType.label}</p>
                    <p className="text-sm text-muted-foreground">{currentShopType.description}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Total Orders', value: stats.totalOrders.toString(), icon: TrendingUp },
            { label: 'Revenue', value: `${stats.totalRevenue.toLocaleString()} ETB`, icon: TrendingUp },
            { label: 'Products', value: stats.totalProducts.toString(), icon: Store },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="p-4 rounded-2xl bg-card shadow-card"
            >
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Info Section */}
        <div className="space-y-3 mb-6">
          <h3 className="font-semibold text-lg">Shop Information</h3>
          
          <div className="p-4 rounded-2xl bg-card shadow-card space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{user?.phone || 'Not set'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{shop?.location || user?.location || 'Not set'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
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
