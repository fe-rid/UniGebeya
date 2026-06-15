import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Boxes,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Loader2,
  PlusCircle,
  FileSpreadsheet,
  ArrowUpDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Shop {
  id: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  discount_price: number | null;
  category: string;
  stock_quantity: number;
  sku: string | null;
}

interface LogEntry {
  id: string;
  productName: string;
  change: number;
  timestamp: string;
}

export function InventoryManagement({ shop }: { shop: Shop }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'low' | 'out'>('all');
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockQuantities, setRestockQuantities] = useState<Record<string, string>>({});
  
  // Local state for stock adjustments logs
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', productName: 'Spaghetti with Meatballs', change: 25, timestamp: new Date(Date.now() - 3600000 * 2).toLocaleString() },
    { id: '2', productName: 'Cappuccino Large', change: 10, timestamp: new Date(Date.now() - 3600000 * 5).toLocaleString() },
    { id: '3', productName: 'Double Cheeseburger', change: -3, timestamp: new Date(Date.now() - 3600000 * 24).toLocaleString() },
  ]);

  // 1. Fetch products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['shop-inventory-products', shop.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, discount_price, category, stock_quantity, sku')
        .eq('shop_id', shop.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as Product[];
    },
  });

  // Stock update mutation (single adjustment)
  const adjustStockMutation = useMutation({
    mutationFn: async ({ productId, newQty }: { productId: string; newQty: number }) => {
      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: Math.max(0, newQty) })
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      const prod = products.find(p => p.id === variables.productId);
      if (prod) {
        const diff = variables.newQty - prod.stock_quantity;
        // Log changes locally
        setLogs(prev => [
          {
            id: Date.now().toString(),
            productName: prod.name,
            change: diff,
            timestamp: new Date().toLocaleString()
          },
          ...prev
        ]);
      }
      queryClient.invalidateQueries({ queryKey: ['shop-inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['shop-dashboard-products'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update stock quantity');
    }
  });

  // Bulk restock mutation
  const bulkRestockMutation = useMutation({
    mutationFn: async (adjustments: { id: string; qty: number }[]) => {
      // Loop sequentially since supabase-js doesn't natively do a multi-row upsert with dynamic calculations easily
      for (const adj of adjustments) {
        const { error } = await supabase
          .from('products')
          .update({ stock_quantity: adj.qty })
          .eq('id', adj.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Bulk restocking completed successfully!');
      setIsRestockOpen(false);
      setRestockQuantities({});
      queryClient.invalidateQueries({ queryKey: ['shop-inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['shop-dashboard-products'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Bulk restock failed');
    }
  });

  // Metrics computation
  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= 5).length;
    const outOfStock = products.filter((p) => p.stock_quantity === 0).length;
    
    // Inventory valuation based on price or discount price
    const valuation = products.reduce((sum, p) => {
      const activePrice = p.discount_price || p.price;
      return sum + (activePrice * p.stock_quantity);
    }, 0);

    return {
      totalProducts,
      lowStock,
      outOfStock,
      valuation
    };
  }, [products]);

  // Filter products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStock = 
        stockFilter === 'all' ||
        (stockFilter === 'instock' && p.stock_quantity > 5) ||
        (stockFilter === 'low' && p.stock_quantity > 0 && p.stock_quantity <= 5) ||
        (stockFilter === 'out' && p.stock_quantity === 0);

      return matchesSearch && matchesStock;
    });
  }, [products, searchTerm, stockFilter]);

  const handleBulkRestock = () => {
    const adjustments: { id: string; qty: number }[] = [];
    
    Object.entries(restockQuantities).forEach(([id, val]) => {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        const prod = products.find(p => p.id === id);
        if (prod) {
          adjustments.push({ id, qty: prod.stock_quantity + parsed });
          
          // Log locally
          setLogs(prev => [
            {
              id: Math.random().toString(),
              productName: prod.name,
              change: parsed,
              timestamp: new Date().toLocaleString()
            },
            ...prev
          ]);
        }
      }
    });

    if (adjustments.length === 0) {
      toast.error('Please input at least one restock quantity');
      return;
    }

    bulkRestockMutation.mutate(adjustments);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Inventory Console</h2>
          <p className="text-muted-foreground text-sm">Monitor stock levels, execute restocks, and audit valuations.</p>
        </div>
        <Button variant="shop" className="sm:w-auto h-11" onClick={() => setIsRestockOpen(true)}>
          <PlusCircle className="w-5 h-5 mr-2" />
          Restock Products
        </Button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Items", value: metrics.totalProducts, desc: "Distinct SKUs", icon: Boxes, color: "text-foreground bg-muted" },
          { title: "Inventory Value", value: `${metrics.valuation.toLocaleString()} ETB`, desc: "Total asset value", icon: TrendingUp, color: "text-success bg-success/10" },
          { title: "Low Stock Items", value: metrics.lowStock, desc: "Stock count <= 5", icon: AlertTriangle, color: "text-warning bg-warning/10" },
          { title: "Out of Stock", value: metrics.outOfStock, desc: "Unavailable to order", icon: RotateCcw, color: "text-destructive bg-destructive/10" },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <Card key={i} className="border border-border/60 shadow-sm">
              <CardContent className="p-5 flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{item.title}</p>
                  <p className="text-2xl font-bold tracking-tight">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{item.desc}</p>
                </div>
                <div className={cn("p-2 rounded-xl", item.color)}>
                  <Icon className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lists & Logs split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Table */}
        <Card className="lg:col-span-2 border border-border/60 shadow-sm flex flex-col justify-between overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg">Product Inventory</CardTitle>
            <CardDescription>Verify, adjust, or search product quantities</CardDescription>
            
            {/* Filter buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'All Stock' },
                  { id: 'instock', label: 'In Stock' },
                  { id: 'low', label: 'Low Stock' },
                  { id: 'out', label: 'Out of Stock' },
                ].map((btn) => (
                  <Button
                    key={btn.id}
                    variant={stockFilter === btn.id ? 'shop' : 'outline'}
                    size="sm"
                    className="h-8 text-xs font-semibold px-3 rounded-lg"
                    onClick={() => setStockFilter(btn.id as any)}
                  >
                    {btn.label}
                  </Button>
                ))}
              </div>
              <div className="relative w-full sm:w-[220px]">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs border-border/80"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-success" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground space-y-2">
                <Boxes className="w-10 h-10 mx-auto opacity-50" />
                <p className="text-sm font-semibold">No stock items found</p>
                <p className="text-xs">Adjust your search term or filter selection.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase font-semibold">
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Stock Level</th>
                      <th className="py-3 px-4 text-center">Adjust Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-foreground">{p.name}</td>
                        <td className="py-3.5 px-4 font-mono text-muted-foreground">{p.sku || '—'}</td>
                        <td className="py-3.5 px-4 text-muted-foreground">{p.category}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border",
                            p.stock_quantity === 0 ? "bg-destructive/10 text-destructive border-destructive/20 animate-pulse" :
                            p.stock_quantity <= 5 ? "bg-warning/10 text-warning border-warning/20" : 
                            "bg-success/10 text-success border-success/20"
                          )}>
                            {p.stock_quantity === 0 ? 'OUT OF STOCK' : p.stock_quantity <= 5 ? 'LOW STOCK' : 'IN STOCK'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-sm text-foreground">
                          {p.stock_quantity}
                        </td>
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-7 h-7 rounded-lg border-border/80"
                              onClick={() => adjustStockMutation.mutate({ productId: p.id, newQty: p.stock_quantity - 1 })}
                              disabled={p.stock_quantity === 0 || adjustStockMutation.isPending}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </Button>
                            <Input
                              type="number"
                              value={p.stock_quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 0) {
                                  adjustStockMutation.mutate({ productId: p.id, newQty: val });
                                }
                              }}
                              className="w-12 h-7 px-1 text-center font-bold text-xs border-border/80"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-7 h-7 rounded-lg border-border/80"
                              onClick={() => adjustStockMutation.mutate({ productId: p.id, newQty: p.stock_quantity + 1 })}
                              disabled={adjustStockMutation.isPending}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Log / History */}
        <Card className="border border-border/60 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-success" />
              Restock History
            </CardTitle>
            <CardDescription>Audit trail of inventory modifications</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[420px]">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start justify-between text-xs pb-3 border-b border-border/40 last:border-b-0">
                <div className="space-y-1 pr-3">
                  <p className="font-semibold text-foreground">{log.productName}</p>
                  <p className="text-[10px] text-muted-foreground">{log.timestamp}</p>
                </div>
                <span className={cn(
                  "font-bold shrink-0 px-2 py-0.5 rounded-full",
                  log.change > 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                )}>
                  {log.change > 0 ? `+${log.change}` : log.change}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-center py-10 text-xs text-muted-foreground">No recent stock changes logged</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Restock Dialog */}
      <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-success" />
              Bulk Restock Panel
            </DialogTitle>
            <DialogDescription className="text-xs">
              Input the quantities to **add** to the current stock level for each product.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-3">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/50 text-xs">
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-foreground truncate max-w-[160px]">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">Current: {p.stock_quantity} units</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-semibold">+</span>
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={restockQuantities[p.id] || ''}
                    onChange={(e) => setRestockQuantities(prev => ({ ...prev, [p.id]: e.target.value }))}
                    min={0}
                    className="w-16 h-8 text-center text-xs border-border/80 font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground font-medium w-8 text-left">units</span>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="mt-5 gap-2 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl"
              onClick={() => {
                setIsRestockOpen(false);
                setRestockQuantities({});
              }}
            >
              Cancel
            </Button>
            <Button
              variant="shop"
              size="sm"
              className="h-10 rounded-xl"
              onClick={handleBulkRestock}
              disabled={bulkRestockMutation.isPending}
            >
              {bulkRestockMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Apply Quantities
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
