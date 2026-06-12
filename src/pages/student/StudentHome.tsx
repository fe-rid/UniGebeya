import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Store, Star, Clock, MapPin, ChevronRight, Zap, Flame, RotateCcw, Sparkles, Tag } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Shop {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  type: string;
  is_open: boolean;
  avatar: string | null;
}

interface PastOrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface PastOrder {
  id: string;
  total_amount: number;
  created_at: string;
  shop_id: string;
  shop: { name: string };
  order_items: PastOrderItem[];
}

const shopTypeLabels: Record<string, string> = {
  cafe: 'Café & Coffee',
  restaurant: 'Restaurant',
  minimarket: 'Mini Market',
  cosmetics: 'Cosmetics',
  other: 'Other',
};

const shopTypeIcons: Record<string, string> = {
  cafe: '☕',
  restaurant: '🍔',
  minimarket: '🛒',
  cosmetics: '💄',
  other: '📦',
};

const promotions = [
  {
    id: 1,
    title: 'Free Delivery Weekend! 🚀',
    description: 'Get free delivery on all orders above 200 ETB this weekend.',
    gradient: 'from-violet-600 via-purple-500 to-fuchsia-500',
    badge: 'Limited Time',
  },
  {
    id: 2,
    title: '20% Off First Order ✨',
    description: 'New to Uni Gebeya? Enjoy 20% off your very first order.',
    gradient: 'from-orange-500 via-amber-500 to-yellow-400',
    badge: 'New Users',
  },
  {
    id: 3,
    title: 'Study Fuel Bundle 📚',
    description: 'Coffee + snack combo for just 80 ETB. Perfect for study sessions!',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-400',
    badge: 'Popular',
  },
];

export default function StudentHome() {
  const { user } = useAuth();
  const { getItemCount, addItem } = useCart();
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePromo, setActivePromo] = useState(0);

  // Auto-rotate promotions
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePromo((prev) => (prev + 1) % promotions.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Fetch shops
  useEffect(() => {
    const fetchShops = async () => {
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setShops(data || []);
      } catch (error) {
        console.error('Error fetching shops:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShops();
  }, []);

  // Fetch past orders for Quick Reorder
  const { data: pastOrders = [] } = useQuery({
    queryKey: ['student-reorder', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          created_at,
          shop_id,
          shop:shops(name),
          order_items(id, product_name, quantity, unit_price)
        `)
        .eq('customer_id', user.id)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as unknown as PastOrder[];
    },
    enabled: !!user,
  });

  // Fetch shop ratings for featured shops
  const { data: shopRatings = {} } = useQuery({
    queryKey: ['shop-ratings-home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('shop_id, runner_rating')
        .not('runner_rating', 'is', null);

      if (error) throw error;

      const ratings: Record<string, { avg: number; count: number }> = {};
      if (data) {
        data.forEach((order: any) => {
          if (!ratings[order.shop_id]) {
            ratings[order.shop_id] = { avg: 0, count: 0 };
          }
          ratings[order.shop_id].count++;
          ratings[order.shop_id].avg += order.runner_rating;
        });
        Object.keys(ratings).forEach((id) => {
          ratings[id].avg = ratings[id].avg / ratings[id].count;
        });
      }
      return ratings;
    },
  });

  const filteredShops = shops.filter(shop => {
    const matchesType = selectedType === 'all' || shop.type === selectedType;
    const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesType && matchesSearch;
  });

  const openShops = filteredShops.filter(s => s.is_open);
  const closedShops = filteredShops.filter(s => !s.is_open);
  const cartCount = getItemCount();

  // Featured shops = open shops with ratings, sorted by rating
  const featuredShops = useMemo(() => {
    return shops
      .filter(s => s.is_open)
      .sort((a, b) => {
        const rA = shopRatings[a.id]?.avg || 0;
        const rB = shopRatings[b.id]?.avg || 0;
        return rB - rA;
      })
      .slice(0, 6);
  }, [shops, shopRatings]);

  const shopTypes = ['all', 'cafe', 'restaurant', 'minimarket', 'cosmetics', 'other'];

  const handleReorder = (order: PastOrder) => {
    order.order_items?.forEach(item => {
      addItem({
        id: item.id,
        shopId: order.shop_id,
        name: item.product_name,
        description: '',
        price: item.unit_price,
        category: '',
        image: '',
        isAvailable: true,
      });
    });
    toast.success('Items added to cart!');
    navigate('/student/cart');
  };

  const getSimulatedDistance = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
    return (Math.abs(hash) % 22 + 3) / 10;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header showLocation showNotification showSearch />

      <div className="px-4 py-4">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <h1 className="text-2xl font-bold">
            Hey, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm">
            What are you craving today?
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-6"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search shops or food..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 rounded-2xl bg-card shadow-card border-0"
          />
        </motion.div>

        {/* Promotions Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
              <Tag className="w-4 h-4 text-primary" />
              Special Offers
            </h2>
            <div className="flex gap-1.5">
              {promotions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActivePromo(i)}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                    i === activePromo ? "bg-primary w-4" : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl h-[140px] shadow-soft">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePromo}
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "absolute inset-0 p-5 bg-gradient-to-br text-white flex flex-col justify-between overflow-hidden",
                  promotions[activePromo].gradient
                )}
              >
                {/* Decorative floaty background shapes */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
                <div className="absolute -left-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
                
                <div className="relative z-10">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider mb-2">
                    {promotions[activePromo].badge}
                  </span>
                  <h3 className="text-base font-extrabold leading-tight">
                    {promotions[activePromo].title}
                  </h3>
                </div>
                <p className="text-xs text-white/95 leading-normal relative z-10 max-w-[85%] font-medium">
                  {promotions[activePromo].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-3 mb-6 -mx-4 px-4"
        >
          {shopTypes.map((type) => {
            const isSelected = selectedType === type;
            const categoryMeta: Record<string, { label: string; icon: string; bg: string }> = {
              all: { label: 'All', icon: '🏪', bg: 'bg-primary/10' },
              cafe: { label: 'Coffee', icon: '☕', bg: 'bg-orange-500/10' },
              restaurant: { label: 'Food', icon: '🍔', bg: 'bg-rose-500/10' },
              minimarket: { label: 'Grocery', icon: '🛒', bg: 'bg-emerald-500/10' },
              cosmetics: { label: 'Beauty', icon: '💄', bg: 'bg-pink-500/10' },
              other: { label: 'More', icon: '📦', bg: 'bg-indigo-500/10' },
            };
            const meta = categoryMeta[type] || categoryMeta.other;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all duration-300 shadow-sm border border-border/40",
                    isSelected
                      ? "gradient-primary text-white scale-110 ring-4 ring-primary/20"
                      : cn("bg-card hover:bg-muted text-foreground", meta.bg)
                  )}
                >
                  <span>{meta.icon}</span>
                </div>
                <span
                  className={cn(
                    "text-[11px] font-semibold transition-colors",
                    isSelected ? "text-primary font-bold" : "text-muted-foreground"
                  )}
                >
                  {meta.label}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Cart Indicator */}
        {cartCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-between"
          >
            <div>
              <p className="font-semibold">{cartCount} items in cart</p>
              <p className="text-sm opacity-80">Ready to checkout?</p>
            </div>
            <a
              href="/student/cart"
              className="px-4 py-2 bg-card text-foreground rounded-xl font-semibold text-sm"
            >
              View Cart
            </a>
          </motion.div>
        )}

        {/* Quick Reorder */}
        {pastOrders.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-primary" />
                Quick Reorder
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
              {pastOrders.map((order) => (
                <motion.div
                  key={order.id}
                  whileTap={{ scale: 0.97 }}
                  className="min-w-[200px] max-w-[200px] p-4 rounded-2xl bg-card shadow-card border border-transparent hover:border-primary/20 transition-all cursor-pointer"
                  onClick={() => handleReorder(order)}
                >
                  <p className="font-semibold text-sm truncate">{order.shop?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {order.order_items?.map(i => i.product_name).join(', ')}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs font-bold text-primary">
                      {Number(order.total_amount).toFixed(0)} ETB
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      Reorder
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Featured Shops */}
        {featuredShops.length > 0 && !searchQuery && selectedType === 'all' && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Featured
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
              {featuredShops.map((shop) => (
                <motion.div
                  key={shop.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/student/shop/${shop.id}`)}
                  className="min-w-[160px] max-w-[160px] rounded-2xl bg-card shadow-card overflow-hidden cursor-pointer group"
                >
                  <div className="relative h-24 bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
                    {shop.avatar ? (
                      <img
                        src={shop.avatar}
                        alt={shop.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Store className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    {shopRatings[shop.id] && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/40 backdrop-blur-sm">
                        <Star className="w-3 h-3 fill-warning text-warning" />
                        <span className="text-[10px] font-bold text-white">
                          {shopRatings[shop.id].avg.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold truncate">{shop.name}</p>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{getSimulatedDistance(shop.id).toFixed(1)} km</span>
                      <span className="mx-0.5">·</span>
                      <Clock className="w-3 h-3" />
                      <span>15 min</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Open Shops */}
        {openShops.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-success" />
              Open Now
            </h2>
            <div className="grid gap-4">
              {openShops.map((shop, index) => (
                <ShopCard key={shop.id} shop={shop} index={index} rating={shopRatings[shop.id]} />
              ))}
            </div>
          </section>
        )}

        {/* Closed Shops */}
        {closedShops.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4 text-muted-foreground">Closed</h2>
            <div className="grid gap-4 opacity-60">
              {closedShops.map((shop, index) => (
                <ShopCard key={shop.id} shop={shop} index={index + openShops.length} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {shops.length === 0 && (
          <div className="text-center py-12">
            <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No shops available yet</p>
            <p className="text-sm text-muted-foreground">Check back soon!</p>
          </div>
        )}

        {shops.length > 0 && filteredShops.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No shops found matching your search</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

// Inline ShopCard component for real data
function ShopCard({ shop, index, rating }: { shop: Shop; index: number; rating?: { avg: number; count: number } }) {
  const navigate = useNavigate();

  const getSimulatedDistance = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
    return (Math.abs(hash) % 22 + 3) / 10;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      onClick={() => navigate(`/student/shop/${shop.id}`)}
      className="group cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-2xl bg-card shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1">
        {/* Image */}
        <div className="relative h-36 overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
          {shop.avatar ? (
            <img
              src={shop.avatar}
              alt={shop.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Store className="w-16 h-16 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Category Badge */}
          <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium bg-card/90 backdrop-blur-sm">
            {shopTypeLabels[shop.type] || shop.type}
          </span>

          {/* Status Badge */}
          <span
            className={cn(
              "absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold",
              shop.is_open
                ? "bg-success text-success-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {shop.is_open ? 'Open' : 'Closed'}
          </span>

          {/* Shop Name on Image */}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-lg font-bold text-white truncate">{shop.name}</h3>
            <p className="text-xs text-white/80 truncate">{shop.description || 'No description'}</p>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{shop.location || 'Location not set'}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-warning text-warning" />
                <span className="font-semibold text-foreground">{rating.avg.toFixed(1)}</span>
                <span>({rating.count})</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{getSimulatedDistance(shop.id).toFixed(1)} km</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
