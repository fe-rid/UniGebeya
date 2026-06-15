import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Tag, Percent, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface PromotionsManagementProps {
  shop: any;
}

export function PromotionsManagement({ shop }: PromotionsManagementProps) {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [discountPrice, setDiscountPrice] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ['shop-products-promotions', shop.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!shop.id,
  });

  const updateDiscountMutation = useMutation({
    mutationFn: async ({ productId, price }: { productId: string, price: number | null }) => {
      const { error } = await supabase
        .from('products')
        .update({ discount_price: price })
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-products-promotions', shop.id] });
      toast.success('Promotion updated successfully');
      setIsDialogOpen(false);
      setSelectedProduct(null);
      setDiscountPrice('');
    },
    onError: (error) => {
      toast.error('Failed to update promotion: ' + error.message);
    }
  });

  const handleOpenDialog = (product: any) => {
    setSelectedProduct(product);
    setDiscountPrice(product.discount_price?.toString() || '');
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedProduct) return;
    
    const priceVal = parseFloat(discountPrice);
    if (discountPrice !== '' && (isNaN(priceVal) || priceVal < 0)) {
      toast.error("Please enter a valid discount price");
      return;
    }
    
    updateDiscountMutation.mutate({
      productId: selectedProduct.id,
      price: discountPrice === '' ? null : priceVal
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activePromotions = products?.filter(p => p.discount_price !== null) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Promotions & Discounts</h2>
        <p className="text-muted-foreground">Manage active discounts on your products to boost sales.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Promotions</CardTitle>
            <Tag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{activePromotions.length}</div>
            <p className="text-xs text-muted-foreground">Products currently discounted</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Product Pricing</CardTitle>
          <CardDescription>Select a product to set or remove a promotional discount price.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">Regular Price</th>
                  <th className="px-6 py-4 font-medium">Discount Price</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {products?.map((product) => (
                  <tr key={product.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{product.name}</td>
                    <td className="px-6 py-4">{product.price.toFixed(2)} ETB</td>
                    <td className="px-6 py-4 font-medium">
                      {product.discount_price !== null ? (
                        <span className="text-success flex items-center gap-1">
                          {product.discount_price.toFixed(2)} ETB
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {product.discount_price !== null ? (
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-success/10 text-success">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-muted text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(product)}>
                        Edit Promotion
                      </Button>
                    </td>
                  </tr>
                ))}
                {products?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No products available to promote.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Promotion for {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-lg">
              <span className="text-muted-foreground">Regular Price:</span>
              <span className="font-semibold">{selectedProduct?.price.toFixed(2)} ETB</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Discounted Price (ETB)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="discount"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 199.99 (Leave blank to remove)"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Set a lower price for the promotion. Clear the input to remove the discount.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={updateDiscountMutation.isPending}
              variant="shop"
            >
              {updateDiscountMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
