import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Package, Coffee, Utensils, ShoppingBag, Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

// Category configurations by section
const productSections = {
  food: {
    label: 'Food',
    icon: Utensils,
    categories: ['Main Dishes', 'Side Dishes', 'Breakfast', 'Snacks', 'Pastries', 'Combos', 'Desserts'],
  },
  drinks: {
    label: 'Drinks',
    icon: Coffee,
    categories: ['Hot Drinks', 'Cold Drinks', 'Juices', 'Smoothies', 'Soft Drinks'],
  },
  other: {
    label: 'Other',
    icon: ShoppingBag,
    categories: ['Essentials', 'Cosmetics', 'Stationery', 'General', 'Other'],
  },
};

const getCategorySection = (category: string): 'food' | 'drinks' | 'other' => {
  if (productSections.food.categories.includes(category)) return 'food';
  if (productSections.drinks.categories.includes(category)) return 'drinks';
  return 'other';
};

export default function ShopProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeSection, setActiveSection] = useState<'food' | 'drinks' | 'other'>('food');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
  });

  // Fetch shop and products
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // First get the shop
        const { data: shopData, error: shopError } = await supabase
          .from('shops')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (shopError) throw shopError;

        if (shopData) {
          setShopId(shopData.id);

          // Fetch products for this shop
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('shop_id', shopData.id)
            .order('created_at', { ascending: false });

          if (productsError) throw productsError;

          setProducts(productsData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Group products by section
  const productsBySection = useMemo(() => {
    return {
      food: products.filter(p => getCategorySection(p.category) === 'food'),
      drinks: products.filter(p => getCategorySection(p.category) === 'drinks'),
      other: products.filter(p => getCategorySection(p.category) === 'other'),
    };
  }, [products]);

  // Group products by category within section
  const groupedProducts = useMemo(() => {
    const sectionProducts = productsBySection[activeSection];
    const grouped: Record<string, Product[]> = {};
    
    sectionProducts.forEach(product => {
      if (!grouped[product.category]) {
        grouped[product.category] = [];
      }
      grouped[product.category].push(product);
    });
    
    return grouped;
  }, [productsBySection, activeSection]);

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        category: product.category,
        image: product.image || '',
      });
      setImagePreview(product.image || null);
    } else {
      setEditingProduct(null);
      const defaultCategory = productSections[activeSection].categories[0];
      setFormData({ name: '', description: '', price: '', category: defaultCategory, image: '' });
      setImagePreview(null);
    }
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${shopId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter product name');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }
    if (!shopId) {
      toast.error('Please set up your shop profile first');
      return;
    }

    setSaving(true);

    try {
      let imageUrl = formData.image;

      // Upload new image if selected
      if (imageFile) {
        setUploading(true);
        try {
          const uploadedUrl = await uploadImage(imageFile);
          if (uploadedUrl) {
            imageUrl = uploadedUrl;
          }
        } catch (error) {
          toast.error('Failed to upload image');
          setSaving(false);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            price: parseFloat(formData.price),
            category: formData.category,
            image: imageUrl || null,
          })
          .eq('id', editingProduct.id);

        if (error) throw error;

        setProducts(products.map(p => 
          p.id === editingProduct.id 
            ? { 
                ...p, 
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                price: parseFloat(formData.price),
                category: formData.category,
                image: imageUrl || null,
              }
            : p
        ));
        toast.success('Product updated');
      } else {
        // Create new product
        const { data, error } = await supabase
          .from('products')
          .insert({
            shop_id: shopId,
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            price: parseFloat(formData.price),
            category: formData.category,
            image: imageUrl || null,
          })
          .select()
          .single();

        if (error) throw error;

        setProducts([data, ...products]);
        toast.success('Product added');
      }
      setIsDialogOpen(false);
      setImageFile(null);
      setImagePreview(null);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productId));
      toast.success('Product deleted');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const toggleAvailability = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_available: !product.is_available })
        .eq('id', productId);

      if (error) throw error;

      setProducts(products.map(p => 
        p.id === productId ? { ...p, is_available: !p.is_available } : p
      ));
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('Failed to update availability');
    }
  };

  const SectionIcon = productSections[activeSection].icon;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!shopId) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header title="Products" showBack />
        <div className="px-4 py-12 text-center">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Set Up Your Shop First</h2>
          <p className="text-muted-foreground mb-4">
            Please complete your shop profile before adding products.
          </p>
          <Button variant="shop" onClick={() => window.location.href = '/shop/profile'}>
            Go to Profile
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Products" showBack />

      <div className="px-4 py-4">
        {/* Section Tabs */}
        <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as typeof activeSection)} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            {Object.entries(productSections).map(([key, section]) => {
              const Icon = section.icon;
              const count = productsBySection[key as keyof typeof productsBySection].length;
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-1.5">
                  <Icon className="w-4 h-4" />
                  <span>{section.label}</span>
                  {count > 0 && (
                    <span className="text-xs bg-muted rounded-full px-1.5">{count}</span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.keys(productSections).map((sectionKey) => (
            <TabsContent key={sectionKey} value={sectionKey} className="space-y-4">
              {/* Add Button */}
              <div className="flex justify-between items-center">
                <p className="text-muted-foreground">
                  {productsBySection[sectionKey as keyof typeof productsBySection].length} items
                </p>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="shop" size="sm" onClick={() => handleOpenDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add {productSections[sectionKey as keyof typeof productSections].label}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Input
                        placeholder="Product Name *"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value.slice(0, 50) })}
                        maxLength={50}
                      />
                      <Input
                        placeholder="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value.slice(0, 100) })}
                        maxLength={100}
                      />
                      <Input
                        type="number"
                        placeholder="Price (ETB) *"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        min={0}
                      />
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Category *" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Food</div>
                          {productSections.food.categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Drinks</div>
                          {productSections.drinks.categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Other</div>
                          {productSections.other.categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Image Upload Section */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Product Image</label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        
                        {imagePreview ? (
                          <div className="relative">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full h-32 object-cover rounded-xl"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8"
                              onClick={removeImage}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-accent transition-colors"
                          >
                            <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Tap to upload image</span>
                          </button>
                        )}
                      </div>

                      <Button variant="shop" className="w-full" onClick={handleSave} disabled={saving || uploading}>
                        {(saving || uploading) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {uploading ? 'Uploading...' : editingProduct ? 'Update Product' : 'Add Product'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Products grouped by category */}
              <AnimatePresence mode="popLayout">
                {Object.keys(groupedProducts).length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <SectionIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No {productSections[activeSection].label.toLowerCase()} items yet</p>
                    <Button variant="shop" className="mt-4" onClick={() => handleOpenDialog()}>
                      Add Your First Item
                    </Button>
                  </motion.div>
                ) : (
                  Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                    <motion.div
                      key={category}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        {category} ({categoryProducts.length})
                      </h3>
                      
                      {categoryProducts.map((product, index) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex gap-3 p-3 rounded-2xl bg-card shadow-card"
                        >
                          <img
                            src={product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
                            alt={product.name}
                            className="w-16 h-16 rounded-xl object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold truncate">{product.name}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                                <p className="text-primary font-bold">{product.price} ETB</p>
                              </div>
                              <Switch
                                checked={product.is_available}
                                onCheckedChange={() => toggleAvailability(product.id)}
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenDialog(product)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
