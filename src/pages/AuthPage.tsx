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
        
        // Force log the user in immediately after registering
        await login(formData.email, formData.password);
        
        toast.success('Account created successfully!');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-100/90 via-amber-50/80 to-rose-100/70 dark:from-slate-950 dark:via-slate-900 dark:to-orange-950/40 flex flex-col justify-center items-center py-8 px-4">
      {/* Decorative Warm Sunset Ambient Glows */}
      <div className="absolute -top-24 -left-20 w-96 h-96 bg-gradient-to-br from-orange-400/35 via-amber-400/30 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse-soft" />
      <div className="absolute -bottom-24 -right-20 w-96 h-96 bg-gradient-to-tr from-rose-400/30 via-orange-300/25 to-amber-400/35 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-300/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card Container */}
      <div className="relative w-full max-w-md bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-2xl rounded-3xl p-6 sm:p-8">
        {/* Header Back Button */}
        <motion.header
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between mb-4"
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
            className="rounded-xl hover:bg-orange-100/50 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>
        </motion.header>

        <div>
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center mb-6"
          >
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-3 shadow-lg shadow-orange-500/30">
              <Package className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Uni Gebeya</h1>
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
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold">Choose Your Role</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    How will you use UniGebeya?
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
                          "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm",
                          selectedRole === role.id
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border/70 hover:border-primary/50"
                        )}
                      >
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground shadow-sm", role.gradient)}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">{role.label}</p>
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                        </div>
                        {selectedRole === role.id && (
                          <motion.div
                            layoutId="roleCheck"
                            className="ml-auto w-6 h-6 rounded-full gradient-primary flex items-center justify-center shadow-sm"
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
                  onClick={() => setMode('register')}
                  className="w-full mt-6 shadow-lg shadow-orange-500/25"
                >
                  Continue
                </Button>
              </motion.div>
            ) : (
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <div className="text-center mb-6">
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
                          className="pl-12 h-14 rounded-xl bg-white/70 dark:bg-slate-800/70 border-orange-100 dark:border-slate-700"
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
                          className="pl-12 h-14 rounded-xl bg-white/70 dark:bg-slate-800/70 border-orange-100 dark:border-slate-700"
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
                          <SelectTrigger className="pl-12 h-14 rounded-xl bg-white/70 dark:bg-slate-800/70 border-orange-100 dark:border-slate-700">
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
                      className="pl-12 h-14 rounded-xl bg-white/70 dark:bg-slate-800/70 border-orange-100 dark:border-slate-700"
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
                      className="pl-12 h-14 rounded-xl bg-white/70 dark:bg-slate-800/70 border-orange-100 dark:border-slate-700"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {mode === 'login' && (
                  <button type="button" className="text-sm text-primary font-medium hover:underline">
                    Forgot Password?
                  </button>
                )}

                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  disabled={isLoading}
                  className="w-full shadow-lg shadow-orange-500/25"
                >
                  {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {mode === 'login' ? (
                    <>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('role')}
                        className="text-primary font-semibold hover:underline"
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
                        className="text-primary font-semibold hover:underline"
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
    </div>
  );
}
