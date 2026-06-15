import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Store, MapPin, AlignLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShopProfileManagementProps {
  shop: any;
}

export function ShopProfileManagement({ shop }: ShopProfileManagementProps) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: shop?.name || '',
    location: shop?.location || '',
    description: shop?.description || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const { error } = await supabase
        .from('shops')
        .update(updatedData)
        .eq('id', shop.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop'] });
      toast.success('Shop profile updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update shop profile: ' + error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Shop name is required');
      return;
    }
    updateProfileMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Shop Profile</h2>
        <p className="text-muted-foreground">Manage how your shop appears to customers.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Public Information</CardTitle>
            <CardDescription>
              This information will be displayed publicly to users on the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Shop Name <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. Campus Cafe"
                  className="pl-9"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="location"
                  name="location"
                  placeholder="e.g. Block 4, Ground Floor"
                  className="pl-9"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <div className="relative">
                <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Tell customers about your shop, specialties, and operating hours..."
                  className="pl-9 min-h-[120px]"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-4 border-t pt-6 bg-muted/20">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setFormData({
                name: shop?.name || '',
                location: shop?.location || '',
                description: shop?.description || '',
              })}
              disabled={updateProfileMutation.isPending}
            >
              Reset
            </Button>
            <Button 
              type="submit" 
              variant="shop"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
