
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS runner_rating smallint CHECK (runner_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS runner_review text;

CREATE POLICY "Customers can rate delivered orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = customer_id AND status = 'delivered')
WITH CHECK (auth.uid() = customer_id AND status = 'delivered');
