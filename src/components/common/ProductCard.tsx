import { Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { items, addItem } = useCart();
  const cartItem = items.find(item => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex gap-4 p-4 rounded-2xl bg-card shadow-card transition-all duration-200",
        !product.isAvailable && "opacity-50"
      )}
    >
      {/* Image */}
      <div className="relative w-20 h-20 flex-shrink-0">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover rounded-xl"
        />
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-background/70 rounded-xl flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">Unavailable</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm truncate">{product.name}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {product.description}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-base font-bold text-primary">
            ${product.price.toFixed(2)}
          </span>
          
          {product.isAvailable && (
            <AnimatePresence mode="wait">
              {quantity > 0 ? (
                <motion.div
                  key="added"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-sm font-semibold text-success flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    {quantity} in cart
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => addItem(product)}
                    className="h-8 w-8 p-0 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
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
                    onClick={() => addItem(product)}
                    className="h-8 gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add
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
