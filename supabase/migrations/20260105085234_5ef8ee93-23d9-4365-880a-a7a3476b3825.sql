-- Allow runners to view orders with status 'accepted' (ready for pickup) that have no runner assigned
CREATE POLICY "Runners can view available orders"
ON public.orders
FOR SELECT
USING (
  public.has_role(auth.uid(), 'runner') 
  AND status = 'accepted' 
  AND runner_id IS NULL
);

-- Allow runners to update orders to assign themselves
CREATE POLICY "Runners can accept orders"
ON public.orders
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'runner')
  AND status = 'accepted'
  AND runner_id IS NULL
)
WITH CHECK (
  runner_id = auth.uid()
);

-- Allow runners to update their assigned orders (status changes)
CREATE POLICY "Runners can update their assigned orders"
ON public.orders
FOR UPDATE
USING (
  runner_id = auth.uid()
);

-- Allow runners to view order items for orders they can access
CREATE POLICY "Runners can view order items"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (
      orders.runner_id = auth.uid()
      OR (public.has_role(auth.uid(), 'runner') AND orders.status = 'accepted' AND orders.runner_id IS NULL)
    )
  )
);