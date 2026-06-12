-- Allow all authenticated users to view open shops (for students browsing)
CREATE POLICY "Authenticated users can view all shops"
ON public.shops FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to view products from any shop
CREATE POLICY "Authenticated users can view all products"
ON public.products FOR SELECT
TO authenticated
USING (true);