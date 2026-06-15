import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { useOrderNotifications } from "./hooks/useOrderNotifications";

// Pages
import SplashScreen from "./pages/SplashScreen";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Student Pages
import StudentHome from "./pages/student/StudentHome";
import ShopDetail from "./pages/student/ShopDetail";
import CartPage from "./pages/student/CartPage";
import CheckoutPage from "./pages/student/CheckoutPage";
import StudentOrders from "./pages/student/StudentOrders";
import StudentProfile from "./pages/student/StudentProfile";
import AddressesPage from "./pages/student/AddressesPage";
import WalletPage from "./pages/student/WalletPage";
import HelpPage from "./pages/student/HelpPage";
import SettingsPage from "./pages/student/SettingsPage";
import NotificationsPage from "./pages/student/NotificationsPage";

// Runner Pages
import RunnerHome from "./pages/runner/RunnerHome";
import RunnerProfile from "./pages/runner/RunnerProfile";
import RunnerActive from "./pages/runner/RunnerActive";
import RunnerEarnings from "./pages/runner/RunnerEarnings";

// Shop Pages
import ShopDashboard from "./pages/shop/ShopDashboard";
import ShopProducts from "./pages/shop/ShopProducts";
import ShopOrders from "./pages/shop/ShopOrders";
import ShopProfile from "./pages/shop/ShopProfile";
import ShopOnboarding from "./pages/shop/ShopOnboarding";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    const redirect = user.role === 'student' ? '/student' : user.role === 'runner' ? '/runner' : '/shop';
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  
  // Enable order notifications for logged-in users
  useOrderNotifications();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={`/${user.role === 'shopkeeper' ? 'shop' : user.role}`} replace /> : <SplashScreen />} />
      <Route path="/auth" element={<AuthPage />} />

      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentHome /></ProtectedRoute>} />
      <Route path="/student/shop/:shopId" element={<ProtectedRoute allowedRoles={['student']}><ShopDetail /></ProtectedRoute>} />
      <Route path="/student/cart" element={<ProtectedRoute allowedRoles={['student']}><CartPage /></ProtectedRoute>} />
      <Route path="/student/checkout" element={<ProtectedRoute allowedRoles={['student']}><CheckoutPage /></ProtectedRoute>} />
      <Route path="/student/orders" element={<ProtectedRoute allowedRoles={['student']}><StudentOrders /></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><StudentProfile /></ProtectedRoute>} />
      <Route path="/student/addresses" element={<ProtectedRoute allowedRoles={['student']}><AddressesPage /></ProtectedRoute>} />
      <Route path="/student/wallet" element={<ProtectedRoute allowedRoles={['student']}><WalletPage /></ProtectedRoute>} />
      <Route path="/student/help" element={<ProtectedRoute allowedRoles={['student']}><HelpPage /></ProtectedRoute>} />
      <Route path="/student/settings" element={<ProtectedRoute allowedRoles={['student']}><SettingsPage /></ProtectedRoute>} />
      <Route path="/student/notifications" element={<ProtectedRoute allowedRoles={['student']}><NotificationsPage /></ProtectedRoute>} />

      {/* Runner Routes */}
      <Route path="/runner" element={<ProtectedRoute allowedRoles={['runner']}><RunnerHome /></ProtectedRoute>} />
      <Route path="/runner/active" element={<ProtectedRoute allowedRoles={['runner']}><RunnerActive /></ProtectedRoute>} />
      <Route path="/runner/earnings" element={<ProtectedRoute allowedRoles={['runner']}><RunnerEarnings /></ProtectedRoute>} />
      <Route path="/runner/profile" element={<ProtectedRoute allowedRoles={['runner']}><RunnerProfile /></ProtectedRoute>} />

      {/* Shop Routes */}
      <Route path="/shop" element={<ProtectedRoute allowedRoles={['shopkeeper']}><ShopDashboard /></ProtectedRoute>} />
      <Route path="/shop/onboarding" element={<ProtectedRoute allowedRoles={['shopkeeper']}><ShopOnboarding /></ProtectedRoute>} />
      <Route path="/shop/:subpage" element={<ProtectedRoute allowedRoles={['shopkeeper']}><ShopDashboard /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminDashboard />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

import { useLocation } from 'react-router-dom';

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isShop = location.pathname.startsWith('/shop');

  if (isAdmin || isShop) {
    return <div className="min-h-screen bg-background flex flex-col w-full">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 flex flex-col items-center justify-start">
      <div className="w-full max-w-md min-h-screen bg-background shadow-2xl relative border-x border-border/10 flex flex-col">
        {children}
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <LayoutWrapper>
              <AppRoutes />
            </LayoutWrapper>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
