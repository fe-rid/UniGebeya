-- Create enum for shop types
CREATE TYPE public.shop_type AS ENUM ('cafe', 'restaurant', 'minimarket', 'cosmetics', 'other');

-- Create shops table
CREATE TABLE public.shops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  type shop_type NOT NULL DEFAULT 'other',
  is_open BOOLEAN DEFAULT false,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'other',
  image TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS policies for shops
CREATE POLICY "Shopkeepers can view their own shop"
ON public.shops FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Shopkeepers can insert their own shop"
ON public.shops FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Shopkeepers can update their own shop"
ON public.shops FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view open shops"
ON public.shops FOR SELECT
USING (is_open = true);

-- RLS policies for products
CREATE POLICY "Shopkeepers can manage their products"
ON public.products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = products.shop_id
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view products from open shops"
ON public.products FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = products.shop_id
    AND shops.is_open = true
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_shops_updated_at
BEFORE UPDATE ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();