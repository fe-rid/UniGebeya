import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Plus, TrendingDown, TrendingUp, RefreshCw, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  type: 'deposit' | 'payment' | 'refund';
  amount: number;
  description: string;
  time: string;
}

export default function WalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [addAmount, setAddAmount] = useState('');

  // Load wallet from localStorage
  useEffect(() => {
    if (!user?.id) return;
    const storedBalance = localStorage.getItem(`wallet_balance_${user.id}`);
    const storedTxns = localStorage.getItem(`wallet_txns_${user.id}`);

    if (storedBalance && storedTxns) {
      setBalance(Number(storedBalance));
      setTransactions(JSON.parse(storedTxns));
    } else {
      // Seed initial wallet values
      const initialBalance = 250;
      const initialTxns: Transaction[] = [
        {
          id: '1',
          type: 'deposit',
          amount: 250,
          description: 'Welcome Bonus Deposit',
          time: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
      ];
      setBalance(initialBalance);
      setTransactions(initialTxns);
      localStorage.setItem(`wallet_balance_${user.id}`, String(initialBalance));
      localStorage.setItem(`wallet_txns_${user.id}`, JSON.stringify(initialTxns));
    }
  }, [user?.id]);

  const updateWallet = (newBalance: number, newTxns: Transaction[]) => {
    if (!user?.id) return;
    setBalance(newBalance);
    setTransactions(newTxns);
    localStorage.setItem(`wallet_balance_${user.id}`, String(newBalance));
    localStorage.setItem(`wallet_txns_${user.id}`, JSON.stringify(newTxns));
  };

  const handleAddFunds = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(addAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const newTxn: Transaction = {
      id: Math.random().toString(),
      type: 'deposit',
      amount: amount,
      description: 'Deposited Funds via Card',
      time: new Date().toISOString(),
    };

    const newBalance = balance + amount;
    const newTxns = [newTxn, ...transactions];

    updateWallet(newBalance, newTxns);
    setIsAddingFunds(false);
    setAddAmount('');
    toast.success(`Successfully added ${amount} ETB to your wallet!`);
  };

  const handleSimulateRefund = () => {
    const refundAmount = 50;
    const newTxn: Transaction = {
      id: Math.random().toString(),
      type: 'refund',
      amount: refundAmount,
      description: 'Order Cancelled Refund',
      time: new Date().toISOString(),
    };

    const newBalance = balance + refundAmount;
    const newTxns = [newTxn, ...transactions];

    updateWallet(newBalance, newTxns);
    toast.success(`Simulated refund: +${refundAmount} ETB`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="My Wallet" showBack />

      <div className="px-4 py-4 max-w-md mx-auto space-y-6">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl gradient-primary text-primary-foreground shadow-elevated relative overflow-hidden"
        >
          <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none">
            <Wallet className="w-48 h-48" />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Available Balance</span>
          </div>

          <p className="text-4xl font-extrabold">{balance.toLocaleString()} ETB</p>
          <p className="text-xs opacity-75 mt-1">Ready for fast, checkout-free campus orders</p>

          <div className="flex gap-3 mt-6">
            <Button
              className="flex-1 bg-white text-primary hover:bg-white/95 rounded-2xl h-12 font-bold shadow-md"
              onClick={() => setIsAddingFunds(true)}
            >
              <Plus className="w-4 h-4 mr-1.5 text-primary" /> Add Funds
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10 rounded-2xl h-12 font-semibold"
              onClick={handleSimulateRefund}
            >
              <RefreshCw className="w-4 h-4 mr-1.5 text-white" /> Simulate Refund
            </Button>
          </div>
        </motion.div>

        {/* Add Funds Form Popup */}
        <AnimatePresence>
          {isAddingFunds && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddFunds}
              className="p-5 rounded-2xl bg-card border shadow-card space-y-4"
            >
              <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                <CreditCard className="w-5 h-5 text-primary" /> Deposit Funds
              </h3>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-semibold">Enter Amount (ETB)</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="e.g. 200"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="h-12 rounded-xl pr-14"
                    required
                    min={10}
                    max={5000}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">ETB</span>
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[100, 250, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAddAmount(String(amt))}
                    className="py-2.5 rounded-xl border text-xs font-semibold hover:bg-muted transition-colors"
                  >
                    +{amt} ETB
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl h-11"
                  onClick={() => setIsAddingFunds(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" className="flex-1 rounded-xl h-11">
                  Confirm Pay
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Transaction History */}
        <div className="space-y-3">
          <h3 className="font-bold text-lg">Transaction History</h3>

          {transactions.length === 0 ? (
            <div className="text-center py-10 border rounded-2xl">
              <p className="text-muted-foreground text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {transactions.map((txn, index) => {
                const isPositive = txn.type === 'deposit' || txn.type === 'refund';
                const Icon = isPositive ? TrendingUp : TrendingDown;
                const iconColor = isPositive ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10';

                return (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-2xl bg-card border shadow-card flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{txn.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(txn.time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>

                    <span className={`font-bold text-sm ${isPositive ? 'text-success' : 'text-foreground'}`}>
                      {isPositive ? '+' : '-'}{txn.amount} ETB
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
