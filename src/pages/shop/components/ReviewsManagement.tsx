import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Star, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface ReviewsManagementProps {
  shop: any;
}

export function ReviewsManagement({ shop }: ReviewsManagementProps) {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['shop-reviews', shop.id],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id, 
          created_at, 
          shop_rating, 
          shop_review,
          customer_id
        `)
        .eq('shop_id', shop.id)
        .not('shop_rating', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!orders || orders.length === 0) return [];

      const customerIds = [...new Set(orders.map(o => o.customer_id))];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, avatar')
        .in('user_id', customerIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      return orders.map(order => ({
        ...order,
        customer: profileMap.get(order.customer_id) || { name: 'Unknown User' }
      }));
    },
    enabled: !!shop.id,
  });

  const { averageRating, ratingCounts } = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return { averageRating: 0, ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }

    let sum = 0;
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    reviews.forEach(review => {
      const rating = review.shop_rating || 0;
      sum += rating;
      if (counts[rating] !== undefined) {
        counts[rating]++;
      }
    });

    return {
      averageRating: sum / reviews.length,
      ratingCounts: counts
    };
  }, [reviews]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reviews Management</h2>
        <p className="text-muted-foreground">Monitor what customers are saying about your shop.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Average Rating</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold">{averageRating.toFixed(1)}</div>
              <div className="space-y-1">
                <div className="flex text-warning">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${star <= Math.round(averageRating) ? 'fill-current' : 'text-muted-foreground/30'}`}
                    />
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">Based on {reviews?.length || 0} reviews</div>
              </div>
            </div>

            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingCounts[star];
                const percentage = reviews && reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1 w-12">
                      <span>{star}</span>
                      <Star className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-warning rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-8 text-right text-muted-foreground">{count}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {(!reviews || reviews.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No reviews yet.</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="border-b border-border last:border-0 pb-6 last:pb-0 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {review.customer?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{review.customer?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(review.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex text-warning">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= (review.shop_rating || 0) ? 'fill-current' : 'text-muted-foreground/30'}`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.shop_review && (
                      <p className="text-sm text-foreground/90 pl-13">
                        {review.shop_review}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
