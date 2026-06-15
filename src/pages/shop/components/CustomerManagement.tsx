import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, Search, Mail, Phone, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface CustomerManagementProps {
  shop: any;
}

export function CustomerManagement({ shop }: CustomerManagementProps) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const { data: customerData, isLoading } = useQuery({
    queryKey: ['shop-customers', shop.id],
    queryFn: async () => {
      // Fetch all orders for this shop
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('customer_id, total_amount, created_at, status')
        .eq('shop_id', shop.id);

      if (ordersError) throw ordersError;

      // Group by customer
      const customerMap = new Map<string, { totalOrders: number; totalSpent: number; lastOrder: string }>();
      
      orders.forEach(order => {
        const existing = customerMap.get(order.customer_id) || { totalOrders: 0, totalSpent: 0, lastOrder: '' };
        
        // Update stats
        existing.totalOrders += 1;
        if (order.status === 'delivered') {
          existing.totalSpent += (order.total_amount || 0);
        }
        
        // Update last order date
        if (!existing.lastOrder || new Date(order.created_at) > new Date(existing.lastOrder)) {
          existing.lastOrder = order.created_at;
        }

        customerMap.set(order.customer_id, existing);
      });

      const customerIds = Array.from(customerMap.keys());

      if (customerIds.length === 0) return [];

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, phone')
        .in('user_id', customerIds);

      if (profilesError) throw profilesError;

      return profiles.map(profile => ({
        ...profile,
        stats: customerMap.get(profile.user_id) || { totalOrders: 0, totalSpent: 0, lastOrder: '' }
      }));
    },
    enabled: !!shop.id,
  });

  const filteredCustomers = useMemo(() => {
    if (!customerData) return [];
    return customerData.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => b.stats.totalSpent - a.stats.totalSpent);
  }, [customerData, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customer Management</h2>
          <p className="text-muted-foreground">View and manage your loyal customers.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search customers..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerData?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th className="px-6 py-4 font-medium text-center">Total Orders</th>
                  <th className="px-6 py-4 font-medium text-right">Total Spent</th>
                  <th className="px-6 py-4 font-medium">Last Order</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.user_id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{customer.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </div>
                          {customer.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{customer.stats.totalOrders}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {customer.stats.totalSpent.toFixed(2)} ETB
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {customer.stats.lastOrder ? format(new Date(customer.stats.lastOrder), 'MMM d, yyyy') : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
