import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Package,
  Layers,
  Upload,
  X,
  ImageIcon,
  Loader2,
  Check,
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Shop {
  id: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image: string | null;
  is_available: boolean;
  sku: string | null;
  stock_quantity: number;
  discount_price: number | null;
}

const CATEGORIES = [
  'Food',
  'Drinks',
  'Snacks',
  'Stationery',
  'Printing Services',
  'Electronics',
  'Groceries',
  'Pharmacy',
  'Other'
];

export function ProductManagement({ shop }: { shop: Shop }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discount_price: '',
    category: 'Food',
    sku: '',
    stock_quantity: '10',
    is_available: true,
    image: ''
  });

  // 1. Fetch products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['shop-management-products', shop.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Product[];
    },
  });

  // Add/Edit Product mutation
  const saveProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        // Edit product
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', payload.id);
        if (error) throw error;
      } else {
        // Add product
        const { error } = await supabase
          .from('products')
          .insert({ ...payload, shop_id: shop.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingProduct ? 'Product updated successfully' : 'Product added successfully');
      queryClient.invalidateQueries({ queryKey: ['shop-management-products'] });
      queryClient.invalidateQueries({ queryKey: ['shop-product-count'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.message || 'Failed to save product');
    }
  });

  // Delete Product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Product deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['shop-management-products'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete product');
    }
  });

  // Bulk status mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Product> }) => {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Products updated successfully');
      setSelectedProductIds([]);
      queryClient.invalidateQueries({ queryKey: ['shop-management-products'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update products');
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Selected products deleted');
      setSelectedProductIds([]);
      queryClient.invalidateQueries({ queryKey: ['shop-management-products'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete products');
    }
  });

  // Helper: Image Upload
  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${shop.id}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image: '' }));
  };

  const handleOpenDialog = (prod: Product | null = null, duplicate = false) => {
    if (prod) {
      setEditingProduct(duplicate ? null : prod);
      setFormData({
        name: duplicate ? `${prod.name} (Copy)` : prod.name,
        description: prod.description || '',
        price: prod.price.toString(),
        discount_price: prod.discount_price ? prod.discount_price.toString() : '',
        category: prod.category,
        sku: duplicate ? `${prod.sku || ''}-COPY` : (prod.sku || ''),
        stock_quantity: prod.stock_quantity.toString(),
        is_available: prod.is_available,
        image: prod.image || ''
      });
      setImagePreview(prod.image || null);
    } else {
      setEditingProduct(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      discount_price: '',
      category: 'Food',
      sku: '',
      stock_quantity: '10',
      is_available: true,
      image: ''
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSaveProduct = async () => {
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('A valid positive price is required');
      return;
    }
    setSaving(true);
    try {
      let finalImageUrl = formData.image;
      if (imageFile) {
        setUploading(true);
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) finalImageUrl = uploadedUrl;
        setUploading(false);
      }

      const payload: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null,
        category: formData.category,
        sku: formData.sku.trim() || null,
        stock_quantity: parseInt(formData.stock_quantity, 10) || 0,
        is_available: formData.is_available,
        image: finalImageUrl || null
      };

      if (editingProduct) {
        payload.id = editingProduct.id;
      }

      saveProductMutation.mutate(payload);
    } catch (err: any) {
      toast.error(err.message || 'Image upload failed');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProductIds((prev) => [...prev, id]);
    } else {
      setSelectedProductIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Filters compilation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Product Management</h2>
          <p className="text-muted-foreground text-sm">Add, duplicate, edit, and bulk edit products on your menu.</p>
        </div>
        <Button variant="shop" className="sm:w-auto h-11" onClick={() => handleOpenDialog()}>
          <Plus className="w-5 h-5 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 border-border/80"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 border border-border/80">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Action Controls */}
        {selectedProductIds.length > 0 && (
          <div className="flex items-center gap-2 w-full md:w-auto bg-muted/40 p-1.5 rounded-2xl border border-border/60">
            <span className="text-xs font-semibold px-2 text-foreground/80">
              {selectedProductIds.length} selected
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs border-border/80 gap-1.5">
                  Bulk Actions
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px] rounded-xl">
                <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ ids: selectedProductIds, updates: { is_available: true } })}>
                  <ToggleRight className="w-4 h-4 mr-2 text-success" /> Make Available
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ ids: selectedProductIds, updates: { is_available: false } })}>
                  <ToggleLeft className="w-4 h-4 mr-2 text-muted-foreground" /> Mark Unavailable
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:bg-destructive/10"
                  onClick={() => {
                    if (confirm(`Delete ${selectedProductIds.length} products?`)) {
                      bulkDeleteMutation.mutate(selectedProductIds);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Bulk Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Products Table Card */}
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-success" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/45" />
              <h3 className="text-sm font-semibold">No Products Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No items match your criteria. Try adding your first item or clear filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase font-semibold">
                    <th className="py-3.5 px-4 w-12 text-center">
                      <Checkbox 
                        checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="py-3.5 px-4">Product</th>
                    <th className="py-3.5 px-4">SKU / Code</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">Stock</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Availability</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedProductIds.includes(p.id)}
                          onCheckedChange={(checked) => handleSelectOne(p.id, !!checked)}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}
                            alt={p.name}
                            className="w-12 h-12 rounded-xl object-cover border border-border"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate max-w-[150px]">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{p.description || 'No description'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-muted-foreground">
                        {p.sku || '—'}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-xs">
                        <span className={cn(
                          "font-bold",
                          p.stock_quantity === 0 ? "text-destructive" :
                          p.stock_quantity <= 5 ? "text-warning" : "text-foreground/80"
                        )}>
                          {p.stock_quantity}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs">
                        {p.discount_price ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-foreground">{p.discount_price} ETB</p>
                            <p className="text-[10px] text-muted-foreground line-through">{p.price} ETB</p>
                          </div>
                        ) : (
                          <p className="font-bold text-foreground">{p.price} ETB</p>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border",
                          p.is_available 
                            ? "bg-success/10 text-success border-success/20" 
                            : "bg-muted text-muted-foreground border-border"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", p.is_available ? "bg-success" : "bg-muted-foreground")} />
                          {p.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 rounded-lg hover:bg-muted"
                            title="Edit"
                            onClick={() => handleOpenDialog(p)}
                          >
                            <Edit2 className="w-4 h-4 text-foreground/80" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 rounded-lg hover:bg-muted"
                            title="Duplicate"
                            onClick={() => handleOpenDialog(p, true)}
                          >
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 rounded-lg hover:bg-destructive/10"
                            title="Delete"
                            onClick={() => {
                              if (confirm(`Delete ${p.name}?`)) {
                                deleteProductMutation.mutate(p.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
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

      {/* Edit/Create Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Fill in the details to customize product listings. Required fields are marked with *.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-foreground/80 mb-1.5 block">Product Name *</label>
              <Input
                placeholder="Product name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.slice(0, 50) })}
                maxLength={50}
                className="h-10 border-border/80"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-foreground/80 mb-1.5 block">Description</label>
              <Textarea
                placeholder="Brief product description (max 100 chars)..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value.slice(0, 100) })}
                maxLength={100}
                className="min-h-[70px] border-border/80 resize-none text-xs"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-foreground/80 mb-1.5 block">Category *</label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="w-full h-10 border border-border/80">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pricing (Price + Discount Price) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground/80 mb-1.5 block">Base Price (ETB) *</label>
                <Input
                  type="number"
                  placeholder="Price"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  min={0.01}
                  step={0.01}
                  className="h-10 border-border/80"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/80 mb-1.5 block">Discount Price (ETB)</label>
                <Input
                  type="number"
                  placeholder="Discount Price"
                  value={formData.discount_price}
                  onChange={(e) => setFormData({ ...formData, discount_price: e.target.value })}
                  min={0}
                  step={0.01}
                  className="h-10 border-border/80"
                />
              </div>
            </div>

            {/* Inventory Fields (SKU + Stock) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground/80 mb-1.5 block">SKU / Code</label>
                <Input
                  placeholder="e.g. ITEM-01"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="h-10 border-border/80"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/80 mb-1.5 block">Stock Quantity *</label>
                <Input
                  type="number"
                  placeholder="Stock"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  min={0}
                  className="h-10 border-border/80"
                />
              </div>
            </div>

            {/* Availability */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/60">
              <div>
                <p className="text-xs font-semibold">Listing Availability</p>
                <p className="text-[10px] text-muted-foreground">Toggle visibility to students ordering nearby</p>
              </div>
              <Switch
                checked={formData.is_available}
                onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                className="data-[state=checked]:bg-success"
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground/80 block">Product Image</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative border border-border rounded-2xl overflow-hidden h-32">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full"
                    onClick={removeImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-28 border border-dashed border-border/60 hover:border-success/60 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-muted/20 transition-all text-muted-foreground hover:text-foreground"
                >
                  <ImageIcon className="w-8 h-8 opacity-70 text-success" />
                  <span className="text-xs">Tap to upload product photo</span>
                </button>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="shop"
              size="sm"
              className="h-10 rounded-xl"
              onClick={handleSaveProduct}
              disabled={saving || uploading}
            >
              {(saving || uploading) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {uploading ? 'Uploading Image...' : editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
