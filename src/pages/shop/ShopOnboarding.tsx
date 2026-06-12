import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Coffee, ShoppingBag, Sparkles, Store, Utensils, Package, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ShopType {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  categories: string[];
}

const shopTypes: ShopType[] = [
  {
    id: 'cafe',
    label: 'Café / Coffee Shop',
    description: 'Coffee, tea, juices & light snacks',
    icon: Coffee,
    categories: ['Hot Drinks', 'Cold Drinks', 'Juices', 'Snacks', 'Pastries'],
  },
  {
    id: 'restaurant',
    label: 'Restaurant / Kitchen',
    description: 'Full meals & traditional food',
    icon: Utensils,
    categories: ['Main Dishes', 'Side Dishes', 'Breakfast', 'Combos', 'Desserts'],
  },
  {
    id: 'minimarket',
    label: 'Mini Market / Kiosk',
    description: 'Snacks, drinks & daily essentials',
    icon: ShoppingBag,
    categories: ['Snacks', 'Drinks', 'Biscuits', 'Chips', 'Essentials'],
  },
  {
    id: 'cosmetics',
    label: 'Cosmetics & Beauty',
    description: 'Beauty products & personal care',
    icon: Sparkles,
    categories: ['Skincare', 'Haircare', 'Makeup', 'Fragrances', 'Accessories'],
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Stationery, electronics, etc.',
    icon: Package,
    categories: ['General', 'Electronics', 'Stationery', 'Clothing', 'Other'],
  },
];

export default function ShopOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [selectedType, setSelectedType] = useState<ShopType | null>(null);
  const [shopDetails, setShopDetails] = useState({
    name: '',
    description: '',
    location: '',
  });

  const handleTypeSelect = (type: ShopType) => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    if (!selectedType) {
      toast.error('Please select your shop type');
      return;
    }
    setStep('details');
  };

  const handleSubmit = () => {
    if (!shopDetails.name.trim()) {
      toast.error('Please enter your shop name');
      return;
    }
    if (!shopDetails.location.trim()) {
      toast.error('Please enter your shop location');
      return;
    }

    // Save shop details (would save to database in real app)
    localStorage.setItem('shopOnboarding', JSON.stringify({
      type: selectedType,
      ...shopDetails,
    }));

    toast.success('Shop created successfully!');
    navigate('/shop');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="p-6 pb-0">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-2"
        >
          <div className="w-12 h-12 rounded-2xl gradient-shop flex items-center justify-center">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Set Up Your Shop</h1>
            <p className="text-sm text-muted-foreground">
              {step === 'type' ? 'Step 1 of 2' : 'Step 2 of 2'}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="px-6 py-6">
        {step === 'type' ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-semibold mb-1">What are you selling?</h2>
              <p className="text-sm text-muted-foreground">
                This helps us organize your products better
              </p>
            </div>

            <div className="space-y-3">
              {shopTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType?.id === type.id;

                return (
                  <motion.button
                    key={type.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleTypeSelect(type)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left",
                      isSelected
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                      isSelected ? "gradient-shop text-white" : "bg-muted"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{type.label}</p>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                    {isSelected && (
                      <motion.div
                        layoutId="typeCheck"
                        className="w-6 h-6 rounded-full gradient-shop flex items-center justify-center"
                      >
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <Button
              variant="shop"
              size="lg"
              className="w-full"
              onClick={handleContinue}
              disabled={!selectedType}
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-semibold mb-1">Shop Details</h2>
              <p className="text-sm text-muted-foreground">
                Tell customers about your {selectedType?.label.toLowerCase()}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Shop Name *</label>
                <Input
                  placeholder="e.g., Buna Bet Coffee"
                  value={shopDetails.name}
                  onChange={(e) => setShopDetails({ ...shopDetails, name: e.target.value.slice(0, 50) })}
                  maxLength={50}
                  className="h-12"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  placeholder="What makes your shop special?"
                  value={shopDetails.description}
                  onChange={(e) => setShopDetails({ ...shopDetails, description: e.target.value.slice(0, 200) })}
                  maxLength={200}
                  className="min-h-[100px] resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {shopDetails.description.length}/200 characters
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Location *</label>
                <Input
                  placeholder="e.g., Student Center, Building A"
                  value={shopDetails.location}
                  onChange={(e) => setShopDetails({ ...shopDetails, location: e.target.value.slice(0, 100) })}
                  maxLength={100}
                  className="h-12"
                />
              </div>

              <div className="p-4 rounded-2xl bg-muted/50">
                <p className="text-sm font-medium mb-2">Product Categories</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Based on your shop type, you can use these categories:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedType?.categories.map((cat) => (
                    <span
                      key={cat}
                      className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setStep('type')}
              >
                Back
              </Button>
              <Button
                variant="shop"
                size="lg"
                className="flex-1"
                onClick={handleSubmit}
              >
                Create Shop
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
