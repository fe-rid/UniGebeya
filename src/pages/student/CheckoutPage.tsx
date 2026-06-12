import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, CreditCard, Check, Loader2, Store } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, shopId, getSubtotal, clearCart } = useCart();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.location || '');

  // Fetch shop details
  const { data: shop } = useQuery({
    queryKey: ['checkout-shop', shopId],
    queryFn: async () => {
      if (!shopId) return null;
      
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, location')
        .eq('id', shopId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!shopId,
  });

  const subtotal = getSubtotal();
  const deliveryFee = 30; // Fixed delivery fee in ETB
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    navigate('/student/cart');
    return null;
  }

  const handlePlaceOrder = async () => {
    if (!user?.id || !shopId) {
      toast.error('Please log in to place an order');
      return;
    }

    if (!deliveryAddress.trim()) {
      toast.error('Please enter a delivery address');
      return;
    }

    setIsProcessing(true);

    try {
      // Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          shop_id: shopId,
          total_amount: total,
          delivery_fee: deliveryFee,
          delivery_address: deliveryAddress.trim(),
          notes: deliveryNote.trim() || null,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      clearCart();
      toast.success('Order placed successfully!');
      navigate('/student/orders', { replace: true });
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-44">
      <Header title="Checkout" showBack />

      <div className="px-4 py-4 space-y-6">
        {/* Delivery Address */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-bold mb-3">Delivery Address</h2>
          <div className="p-4 rounded-2xl bg-card shadow-card">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.phone || 'No phone set'}</p>
              </div>
            </div>
            <Input
              placeholder="Enter delivery address (e.g., Dorm Building A, Room 205)"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
        </motion.section>

        {/* Order Summary */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-bold mb-3">Order Summary</h2>
          <div className="p-4 rounded-2xl bg-card shadow-card">
            {shop && (
              <div className="flex items-center gap-3 pb-4 mb-4 border-b">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Store className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="font-semibold">{shop.name}</p>
                  <p className="text-xs text-muted-foreground">{shop.location || 'Location not set'}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.quantity}x {item.product.name}
                  </span>
                  <span className="font-medium">
                    {(item.product.price * item.quantity).toFixed(0)} ETB
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Delivery Note */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-bold mb-3">Delivery Note</h2>
          <Input
            placeholder="Any special instructions? (optional)"
            value={deliveryNote}
            onChange={(e) => setDeliveryNote(e.target.value)}
            className="h-14 rounded-xl"
          />
        </motion.section>

        {/* Payment Method */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-bold mb-3">Payment Method</h2>
          <div className="p-4 rounded-2xl bg-card shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Cash on Delivery</p>
                <p className="text-xs text-muted-foreground">Pay when you receive</p>
              </div>
              <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Order Footer */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-elevated px-4 py-4 pb-safe"
      >
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{subtotal.toFixed(0)} ETB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery fee</span>
            <span className="font-medium">{deliveryFee} ETB</span>
          </div>
          <div className="flex justify-between pt-3 border-t">
            <span className="font-bold">Total</span>
            <span className="font-bold text-primary text-lg">{total.toFixed(0)} ETB</span>
          </div>
          <Button
            variant="gradient"
            size="lg"
            onClick={handlePlaceOrder}
            disabled={isProcessing || !deliveryAddress.trim()}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              'Place Order'
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
