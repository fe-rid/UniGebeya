import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Mail, Lock, User, ArrowLeft, GraduationCap, Bike, Store, Phone, Building2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type AuthMode = 'login' | 'register' | 'role';

const universities = [
  'Addis Ababa University – Addis Ababa',
  'Jimma University – Jimma',
  'Bahir Dar University – Bahir Dar',
  'University of Gondar – Gondar',
  'Hawassa University – Hawassa',
  'Mekelle University – Mekelle',
  'Haramaya University – Haramaya',
  'Adama Science and Technology University – Adama',
  'Arba Minch University – Arba Minch',
  'Jigjiga University – Jigjiga',
  'Addis Ababa Science and Technology University – Addis Ababa',
  'Ambo University – Ambo',
  'Dilla University – Dilla',
  'Debre Berhan University – Debre Berhan',
  'Wollo University – Dessie / Kombolcha',
  'Debre Markos University – Debre Markos',
  'Wolaita Sodo University – Sodo',
  'Madda Walabu University – Robe',
  'Werabe University – Werabe',
  'Wachamo University – Hosaena',
  'Debre Tabor University – Debre Tabor',
  'Wolkite University – Welkite',
  'Arsi University – Asella',
  'Samara University – Semera',
  'Assosa University – Assosa',
  'Dire Dawa University – Dire Dawa',
  'Wollega University – Nekemte',
  'Mattu University – Mattu',
  'Mizan-Tepi University – Mizan Teferi',
  'Adigrat University – Adigrat',
  'Bule Hora University – Bule Hora',
  'Aksum University – Aksum',
  'Bonga University – Bonga',
  'Oda Bultum University – Chiro',
  'Raya University – Maichew',
  'Selale University – Fiche',
  'Debark University – Debark',
  'Kebri Dehar University – Kebri Dahar',
  'Gambella University – Gambella',
  'Mekdela Amba University – Tulu Awlia',
  'Dembi Dolo University – Dembi Dolo',
  'Jinka University – Jinka',
  'Other',
];

const roles: { id: UserRole; label: string; icon: React.ElementType; description: string; gradient: string }[] = [
  { 
    id: 'student', 
    label: 'Student', 
    icon: GraduationCap, 
    description: 'Order food from campus shops',
    gradient: 'gradient-primary'
  },
  { 
    id: 'runner', 
    label: 'Runner', 
    icon: Bike, 
    description: 'Deliver orders and earn money',
    gradient: 'gradient-runner'
  },
  { 
    id: 'shopkeeper', 
    label: 'Shopkeeper', 
    icon: Store, 
    description: 'Manage your campus shop',
    gradient: 'gradient-shop'
  },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, user } = useAuth();
  
  const initialMode = (location.state as { mode?: AuthMode })?.mode || 'login';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    university: '',
  });

  useEffect(() => {
    if (!user) return;

    const target = `/${user.role === 'shopkeeper' ? 'shop' : user.role}`;
    navigate(target, { replace: true });
  }, [user, navigate]);

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[\+]?[0-9]{10,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        // Validate phone number
        if (!validatePhone(formData.phone)) {
          toast.error('Please enter a valid phone number');
          setIsLoading(false);
          return;
        }
        
        // Validate university selection
        if (!formData.university) {
          toast.error('Please select your university');
          setIsLoading(false);
          return;
        }

        await register(formData.name, formData.email, formData.password, selectedRole, formData.phone, formData.university);
        toast.success('Account created successfully!');
      }
      // Navigation happens automatically via AuthContext effect
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleContinue = () => {
    setMode('register');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-4 p-4"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (mode === 'register') {
              setMode('role');
            } else if (mode === 'role') {
              setMode('login');
            } else {
              navigate('/');
            }
          }}
          className="rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </motion.header>

      <div className="px-6 pb-8">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Uni Gebeya</h1>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'role' ? (
            <motion.div
              key="role"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold">Choose Your Role</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  How will you use Uni Gebeya?
                </p>
              </div>

              <div className="space-y-3">
                {roles.map((role) => {
                  const Icon = role.icon;
                  return (
                    <motion.button
                      key={role.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedRole(role.id)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200",
                        selectedRole === role.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground", role.gradient)}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{role.label}</p>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                      {selectedRole === role.id && (
                        <motion.div
                          layoutId="roleCheck"
                          className="ml-auto w-6 h-6 rounded-full gradient-primary flex items-center justify-center"
                        >
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <Button
                variant="gradient"
                size="lg"
                onClick={handleRoleContinue}
                className="w-full mt-6"
              >
                Continue
              </Button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold">
                  {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {mode === 'login' 
                    ? 'Sign in to continue' 
                    : `Sign up as a ${selectedRole}`}
                </p>
              </div>

              <div className="space-y-4">
                {mode === 'register' && (
                  <>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value.slice(0, 100) })}
                        className="pl-12 h-14 rounded-xl"
                        required
                        maxLength={100}
                      />
                    </div>

                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="tel"
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.slice(0, 15) })}
                        className="pl-12 h-14 rounded-xl"
                        required
                        maxLength={15}
                      />
                    </div>

                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10 pointer-events-none" />
                      <Select
                        value={formData.university}
                        onValueChange={(value) => setFormData({ ...formData, university: value })}
                      >
                        <SelectTrigger className="pl-12 h-14 rounded-xl">
                          <SelectValue placeholder="Select University" />
                        </SelectTrigger>
                        <SelectContent>
                          {universities.map((uni) => (
                            <SelectItem key={uni} value={uni}>
                              {uni}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-12 h-14 rounded-xl"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-12 h-14 rounded-xl"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {mode === 'login' && (
                <button type="button" className="text-sm text-primary font-medium">
                  Forgot Password?
                </button>
              )}

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>

              {mode === 'login' && (
                <div className="space-y-4 pt-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Demo Accounts</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { email: 'student@uni.edu', label: 'Student' },
                      { email: 'runner@uni.edu', label: 'Runner' },
                      { email: 'shop@uni.edu', label: 'Shop' },
                    ].map((demo) => (
                      <button
                        key={demo.email}
                        type="button"
                        onClick={() => setFormData({ ...formData, email: demo.email, password: 'demo123' })}
                        className="p-2 rounded-xl border hover:bg-muted transition-colors text-center"
                      >
                        <p className="font-medium">{demo.label}</p>
                        <p className="text-muted-foreground truncate">{demo.email}</p>
                      </button>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-amber-500/30 hover:bg-amber-500/5 text-amber-600 dark:text-amber-400 h-12 rounded-xl flex items-center justify-center gap-2 font-semibold"
                    onClick={() => navigate('/admin')}
                  >
                    <Shield className="w-4 h-4 text-amber-500" /> Continue as Admin
                  </Button>
                </div>
              )}

              <p className="text-center text-sm text-muted-foreground">
                {mode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('role')}
                      className="text-primary font-semibold"
                    >
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-primary font-semibold"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
