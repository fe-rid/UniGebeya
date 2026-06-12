import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading && user && showContent) {
      const route = 
        user.role === 'student' ? '/student' :
        user.role === 'runner' ? '/runner' : '/shop';
      navigate(route, { replace: true });
    }
  }, [user, isLoading, showContent, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-primary">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Package className="w-16 h-16 text-primary-foreground" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 gradient-primary relative overflow-hidden">
        {/* Floating Decorations */}
        <motion.div
          className="absolute top-20 left-10 w-20 h-20 rounded-full bg-white/10"
          animate={{ y: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-40 right-8 w-14 h-14 rounded-full bg-white/10"
          animate={{ y: [0, 15, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 0.5 }}
        />
        <motion.div
          className="absolute bottom-32 left-20 w-24 h-24 rounded-full bg-white/5"
          animate={{ y: [0, -25, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
        />

        {/* Content */}
        <div className="relative flex flex-col items-center justify-center h-full px-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-24 h-24 rounded-3xl bg-card shadow-elevated flex items-center justify-center mb-6"
          >
            <Package className="w-12 h-12 text-primary" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-extrabold text-primary-foreground mb-2"
          >
            Uni Gebeya
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-primary-foreground/80"
          >
            Campus delivery, made simple
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-8 mt-10"
          >
            {[
              { value: '15+', label: 'Shops' },
              { value: '500+', label: 'Students' },
              { value: '10min', label: 'Avg. Time' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-primary-foreground">{stat.value}</p>
                <p className="text-xs text-primary-foreground/70">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom Section */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
        className="bg-card rounded-t-[2rem] p-8 -mt-8 relative z-10"
      >
        <h2 className="text-2xl font-bold text-center mb-2">Get Started</h2>
        <p className="text-muted-foreground text-center text-sm mb-6">
          Order food, become a runner, or manage your shop
        </p>

        <div className="flex flex-col gap-3">
          <Button
            variant="gradient"
            size="lg"
            onClick={() => navigate('/auth', { state: { mode: 'login' } })}
            className="w-full"
          >
            Sign In
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/auth', { state: { mode: 'role' } })}
            className="w-full"
          >
            Create Account
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
