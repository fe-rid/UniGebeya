import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ShoppingBag, Clock, User, Package, DollarSign, LayoutDashboard, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const studentNav: NavItem[] = [
  { icon: Home, label: 'Home', path: '/student' },
  { icon: ShoppingBag, label: 'Cart', path: '/student/cart' },
  { icon: Clock, label: 'Orders', path: '/student/orders' },
  { icon: User, label: 'Profile', path: '/student/profile' },
];

const runnerNav: NavItem[] = [
  { icon: Package, label: 'Deliveries', path: '/runner' },
  { icon: Clock, label: 'Active', path: '/runner/active' },
  { icon: DollarSign, label: 'Earnings', path: '/runner/earnings' },
  { icon: User, label: 'Profile', path: '/runner/profile' },
];

const shopkeeperNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/shop' },
  { icon: Store, label: 'Products', path: '/shop/products' },
  { icon: Package, label: 'Orders', path: '/shop/orders' },
  { icon: User, label: 'Profile', path: '/shop/profile' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return null;

  const navItems = 
    user.role === 'student' ? studentNav :
    user.role === 'runner' ? runnerNav :
    shopkeeperNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 glass border-t pb-safe">
      <div className="flex items-center justify-around h-16 w-full">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/student' && item.path !== '/runner' && item.path !== '/shop' && 
             location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-center w-full h-full"
            >
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1 : 0.9,
                  y: isActive ? -2 : 0,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={cn(
                  "flex flex-col items-center gap-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </motion.div>
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-0.5 w-8 h-1 rounded-full gradient-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
