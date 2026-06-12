import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, MapPin, Trash2, Home, BookOpen, GraduationCap, PenTool } from 'lucide-react';
import { toast } from 'sonner';

interface SavedAddress {
  id: string;
  label: 'dormitory' | 'classroom' | 'library' | 'custom';
  name: string;
  details: string;
}

const labelIcons = {
  dormitory: Home,
  classroom: GraduationCap,
  library: BookOpen,
  custom: MapPin,
};

const labelNames = {
  dormitory: 'Dormitory',
  classroom: 'Classroom',
  library: 'Library',
  custom: 'Custom Location',
};

export default function AddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newAddr, setNewAddr] = useState({
    label: 'dormitory' as SavedAddress['label'],
    name: '',
    details: '',
  });

  // Load addresses from localStorage
  useEffect(() => {
    if (!user?.id) return;
    const stored = localStorage.getItem(`addresses_${user.id}`);
    if (stored) {
      setAddresses(JSON.parse(stored));
    } else {
      // Seed default addresses
      const defaults: SavedAddress[] = [
        { id: '1', label: 'dormitory', name: 'Dorm 302, Block B', details: 'Main Campus Student Dormitories' },
        { id: '2', label: 'library', name: 'Nelson Mandela Library', details: '2nd Floor Quiet Zone' },
      ];
      setAddresses(defaults);
      localStorage.setItem(`addresses_${user.id}`, JSON.stringify(defaults));
    }
  }, [user?.id]);

  const saveToStorage = (updatedList: SavedAddress[]) => {
    if (!user?.id) return;
    setAddresses(updatedList);
    localStorage.setItem(`addresses_${user.id}`, JSON.stringify(updatedList));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddr.name.trim()) {
      toast.error('Please enter a location name');
      return;
    }

    const item: SavedAddress = {
      id: Math.random().toString(),
      label: newAddr.label,
      name: newAddr.name,
      details: newAddr.details || user?.university || 'Campus',
    };

    saveToStorage([...addresses, item]);
    setIsAdding(false);
    setNewAddr({ label: 'dormitory', name: '', details: '' });
    toast.success('Address saved successfully!');
  };

  const handleDelete = (id: string) => {
    const updated = addresses.filter((a) => a.id !== id);
    saveToStorage(updated);
    toast.success('Address deleted');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Saved Addresses" showBack />

      <div className="px-4 py-4 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {isAdding ? (
            <motion.form
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              onSubmit={handleAdd}
              className="p-5 rounded-2xl bg-card border shadow-card space-y-4 mb-6"
            >
              <h3 className="font-bold text-lg">Add New Address</h3>

              {/* Label selector */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-2">Location Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['dormitory', 'classroom', 'library', 'custom'] as const).map((lbl) => {
                    const Icon = labelIcons[lbl];
                    return (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setNewAddr({ ...newAddr, label: lbl })}
                        className={`p-3 rounded-xl flex flex-col items-center gap-1 border transition-all ${
                          newAddr.label === lbl
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{labelNames[lbl]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Location Name (e.g. Dorm Room, Lab)</label>
                <Input
                  type="text"
                  placeholder="e.g. Dorm 104, Block A"
                  value={newAddr.name}
                  onChange={(e) => setNewAddr({ ...newAddr, name: e.target.value })}
                  maxLength={50}
                  required
                />
              </div>

              {/* Details */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Additional Details (Optional)</label>
                <Input
                  type="text"
                  placeholder="e.g. Near the main entrance"
                  value={newAddr.details}
                  onChange={(e) => setNewAddr({ ...newAddr, details: e.target.value })}
                  maxLength={100}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" className="flex-1">
                  Save Address
                </Button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4"
            >
              <Button
                variant="outline"
                className="w-full h-14 border-dashed rounded-2xl flex items-center justify-center gap-2"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="w-5 h-5 text-primary" />
                <span className="font-semibold text-primary">Add New Address</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          <h2 className="font-bold text-lg mb-2">My Saved Locations</h2>
          {addresses.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-2xl">
              <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No saved addresses yet</p>
            </div>
          ) : (
            addresses.map((addr, index) => {
              const Icon = labelIcons[addr.label];
              return (
                <motion.div
                  key={addr.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-2xl bg-card border shadow-card flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{addr.name}</p>
                      <p className="text-xs text-muted-foreground">{addr.details}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                        {labelNames[addr.label]}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(addr.id)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
