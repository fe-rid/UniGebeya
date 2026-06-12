import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { getShopById } from '@/data/mockData';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, shopId, updateQuantity, removeItem, clearCart, getSubtotal } = useCart();

  const shop = shopId ? getShopById(shopId) : null;
  const subtotal = getSubtotal();
  const deliveryFee = shop?.deliveryFee || 0;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header title="Cart" showBack />
        
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6"
          >
            <ShoppingBag className="w-10 h-10 text-muted-foreground" />
          </motion.div>
          <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground text-center mb-6">
            Add items from a shop to get started
          </p>
          <Button variant="gradient" onClick={() => navigate('/student')}>
            Browse Shops
          </Button>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-44">
      <Header title="Cart" showBack />

      <div className="px-4 py-4">
        {/* Shop Info */}
        {shop && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-card mb-6"
          >
            <img
              src={shop.image}
              alt={shop.name}
              className="w-14 h-14 rounded-xl object-cover"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{shop.name}</h3>
              <p className="text-sm text-muted-foreground">{shop.location}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-destructive hover:text-destructive"
            >
              Clear
            </Button>
          </motion.div>
        )}

        {/* Cart Items */}
        <div className="space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={item.product.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex gap-4 p-4 rounded-2xl bg-card shadow-card"
            >
              <img
                src={item.product.image}
                alt={item.product.name}
                className="w-20 h-20 rounded-xl object-cover"
              />
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{item.product.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {item.product.description}
                </p>
                <p className="text-primary font-bold mt-1">
                  ${(item.product.price * item.quantity).toFixed(2)}
                </p>
              </div>

              <div className="flex flex-col items-end justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.product.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="h-8 w-8 rounded-lg"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-6 text-center font-semibold">{item.quantity}</span>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="h-8 w-8 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Checkout Footer */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-elevated px-4 py-4 pb-safe"
      >
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery fee</span>
            <span className="font-medium">${deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-3 border-t">
            <span className="font-bold">Total</span>
            <span className="font-bold text-primary text-lg">${total.toFixed(2)}</span>
          </div>
          <Button
            variant="gradient"
            size="lg"
            onClick={() => navigate('/student/checkout')}
            className="w-full"
          >
            Proceed to Checkout
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
