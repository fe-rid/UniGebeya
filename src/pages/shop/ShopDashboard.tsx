import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShopLayout } from '@/components/layout/ShopLayout';
import { Header } from '@/components/layout/Header';

// Subcomponents
import { DashboardOverview } from './components/DashboardOverview';
import { OrderManagement } from './components/OrderManagement';
import { ProductManagement } from './components/ProductManagement';
import { InventoryManagement } from './components/InventoryManagement';
import { RevenueManagement } from './components/RevenueManagement';
import { CustomerManagement } from './components/CustomerManagement';
import { ReviewsManagement } from './components/ReviewsManagement';
import { PromotionsManagement } from './components/PromotionsManagement';
import { NotificationsCenter } from './components/NotificationsCenter';
import { DeliveryTracking } from './components/DeliveryTracking';
import { BusinessAnalytics } from './components/BusinessAnalytics';
import { ShopProfileManagement } from './components/ShopProfileManagement';
import { SettingsManagement } from './components/SettingsManagement';
import { HelpSupport } from './components/HelpSupport';

interface Shop {
  id: string;
  name: string;
  is_open: boolean;
  description: string | null;
  location: string | null;
  type: string;
}

export default function ShopDashboard() {
  const navigate = useNavigate();
  const { subpage = 'dashboard' } = useParams<{ subpage?: string }>();

  // Fetch shop data
  const { data: shop, isLoading: shopLoading, error: shopError } = useQuery({
    queryKey: ['my-shop'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;

      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('user_id', session.session.user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Shop | null;
    },
  });

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-success" />
      </div>
    );
  }

  // If no shop is configured yet, show the onboarding prompt
  if (!shop) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border p-8 rounded-3xl shadow-soft text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-success" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Set Up Your Shop</h2>
            <p className="text-muted-foreground text-sm">
              Please complete your shop profile and onboard to start receiving orders on Uni Gebeya.
            </p>
          </div>
          <Button variant="shop" className="w-full h-11" onClick={() => navigate('/shop/onboarding')}>
            Get Onboarded
          </Button>
        </div>
      </div>
    );
  }

  // Render subpage content dynamically
  const renderContent = () => {
    switch (subpage) {
      case 'dashboard':
        return <DashboardOverview shop={shop} />;
      case 'orders':
        return <OrderManagement shop={shop} />;
      case 'products':
        return <ProductManagement shop={shop} />;
      case 'inventory':
        return <InventoryManagement shop={shop} />;
      case 'revenue':
        return <RevenueManagement shop={shop} />;
      case 'customers':
        return <CustomerManagement shop={shop} />;
      case 'reviews':
        return <ReviewsManagement shop={shop} />;
      case 'promotions':
        return <PromotionsManagement shop={shop} />;
      case 'notifications':
        return <NotificationsCenter shop={shop} />;
      case 'tracking':
        return <DeliveryTracking shop={shop} />;
      case 'analytics':
        return <BusinessAnalytics shop={shop} />;
      case 'profile':
        return <ShopProfileManagement shop={shop} />;
      case 'settings':
        return <SettingsManagement shop={shop} />;
      case 'support':
        return <HelpSupport shop={shop} />;
      default:
        return <DashboardOverview shop={shop} />;
    }
  };

  return (
    <ShopLayout activeSubpage={subpage}>
      {renderContent()}
    </ShopLayout>
  );
}
