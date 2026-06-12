import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, ShoppingBag, Store, Loader2, Plus, Check, Star } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';

interface Shop {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  type: string;
  is_open: boolean;
  avatar: string | null;
}

interface Product {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image: string | null;
  is_available: boolean;
}

const shopTypeLabels: Record<string, string> = {
  cafe: 'Café & Coffee',
  restaurant: 'Restaurant',
  minimarket: 'Mini Market',
  cosmetics: 'Cosmetics',
  other: 'Other',
};

const deliveryTimeEstimates: Record<string, string> = {
  cafe: '10-15 min',
  restaurant: '15-25 min',
  minimarket: '10-20 min',
  cosmetics: '15-20 min',
  other: '15-30 min',
};

const getSimulatedDistance = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return (Math.abs(hash) % 22 + 3) / 10; // 0.3 to 2.5 km
};

export default function ShopDetail() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const { items, getSubtotal, getItemCount, shopId: cartShopId, addItem } = useCart();
  
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: ratingData } = useQuery({
    queryKey: ['shop-rating', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('runner_rating')
        .eq('shop_id', shopId)
        .not('runner_rating', 'is', null);
      if (error) throw error;
      if (!data || data.length === 0) return { avg: 0, count: 0 };
      const sum = data.reduce((s, o) => s + (o.runner_rating || 0), 0);
      return { avg: sum / data.length, count: data.length };
    },
    enabled: !!shopId,
  });

  useEffect(() => {
    const fetchShopAndProducts = async () => {
      if (!shopId) return;

      try {
        // Fetch shop
        const { data: shopData, error: shopError } = await supabase
          .from('shops')
          .select('*')
          .eq('id', shopId)
          .maybeSingle();

        if (shopError) throw shopError;
        setShop(shopData);

        // Fetch products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('shop_id', shopId)
          .order('category', { ascending: true });

        if (productsError) throw productsError;
        setProducts(productsData || []);
      } catch (error) {
        console.error('Error fetching shop:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopAndProducts();
  }, [shopId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background">
        <Header showBack />
        <div className="flex flex-col items-center justify-center py-20">
          <Store className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold">Shop not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/student')}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Group products by category
  const productsByCategory = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const cartCount = getItemCount();
  const cartTotal = getSubtotal();
  const isCurrentShop = cartShopId === shopId;

  return (
    <div className="min-h-screen bg-background">
      <Header showBack transparent />

      {/* Hero Image */}
      <div className="relative h-56 -mt-14 bg-gradient-to-br from-primary/20 to-accent/20">
        {shop.avatar ? (
          <img
            src={shop.avatar}
            alt={shop.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Store className="w-24 h-24 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      {/* Shop Info Card */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative -mt-20 mx-4"
      >
        <div className="bg-card rounded-2xl shadow-elevated p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">{shop.name}</h1>
              <p className="text-sm text-muted-foreground">{shop.description || 'No description'}</p>
            </div>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold",
                shop.is_open
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {shop.is_open ? 'Open' : 'Closed'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="px-2 py-1 rounded-lg bg-muted text-xs font-medium">
              {shopTypeLabels[shop.type] || shop.type}
            </span>
            {shop.location && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{shop.location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span className="font-semibold text-foreground">{ratingData?.avg.toFixed(1) || '—'}</span>
              <span className="text-xs">({ratingData?.count || 0})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{deliveryTimeEstimates[shop.type] || '15-30 min'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{getSimulatedDistance(shop.id).toFixed(1)} km</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Products */}
      <div className="px-4 py-6 pb-32">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No products available yet</p>
          </div>
        ) : (
          Object.entries(productsByCategory).map(([category, categoryProducts], categoryIndex) => (
            <motion.section
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
              className="mb-8"
            >
              <h2 className="text-lg font-bold mb-4">{category}</h2>
              <div className="space-y-3">
                {categoryProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    shopId={shopId!}
                    isShopOpen={shop.is_open}
                  />
                ))}
              </div>
            </motion.section>
          ))
        )}
      </div>

      {/* Floating Cart Button */}
      {isCurrentShop && cartCount > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-6 left-0 right-0 px-4 max-w-md mx-auto z-50"
        >
          <Button
            variant="gradient"
            size="lg"
            onClick={() => navigate('/student/cart')}
            className="w-full shadow-elevated"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>View Cart ({cartCount})</span>
            <span className="ml-auto font-bold">{cartTotal.toFixed(0)} ETB</span>
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({ product, shopId, isShopOpen }: { product: Product; shopId: string; isShopOpen: boolean }) {
  const { items, addItem, updateQuantity } = useCart();
  const cartItem = items.find(item => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;

  const handleAddItem = () => {
    const cartProduct = {
      id: product.id,
      shopId: shopId,
      name: product.name,
      description: product.description || '',
      price: product.price,
      category: product.category,
      image: product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      isAvailable: product.is_available,
    };
    addItem(cartProduct);
  };

  const handleRemoveOne = () => {
    updateQuantity(product.id, quantity - 1);
  };

  const isAvailable = product.is_available && isShopOpen;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex gap-4 p-4 rounded-2xl bg-card shadow-card transition-all duration-200 border border-border/40 hover:border-primary/20",
        !isAvailable && "opacity-50"
      )}
    >
      {/* Image */}
      <div className="relative w-20 h-20 flex-shrink-0">
        <img
          src={product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
          alt={product.name}
          className="w-full h-full object-cover rounded-xl"
        />
        {!isAvailable && (
          <div className="absolute inset-0 bg-background/70 rounded-xl flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">Unavailable</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h4 className="font-semibold text-sm truncate">{product.name}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
            {product.description || 'No description'}
          </p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-base font-bold text-primary">
            {product.price.toFixed(0)} ETB
          </span>
          
          {isAvailable && (
            <AnimatePresence mode="wait">
              {quantity > 0 ? (
                <motion.div
                  key="added"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-2 bg-secondary rounded-xl p-1"
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRemoveOne}
                    className="h-8 w-8 p-0 rounded-lg text-foreground font-semibold hover:bg-background"
                  >
                    -
                  </Button>
                  <span className="text-xs font-bold px-1 text-foreground min-w-[12px] text-center">
                    {quantity}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleAddItem}
                    className="h-8 w-8 p-0 rounded-lg text-foreground font-semibold hover:bg-background"
                  >
                    +
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="add"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Button
                    size="sm"
                    variant="gradient"
                    onClick={handleAddItem}
                    className="h-8 gap-1 rounded-xl px-3 font-semibold"
                  >
                    + Add
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}
