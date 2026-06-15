-- ============================================================
-- Migration: Shopkeeper Dashboard Database Extensions
-- Adds products and orders schema extensions, and updates trigger rules
-- ============================================================

-- 1) Extend products table with SKU, Stock, and Discount Price
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10,2) DEFAULT NULL;

-- 2) Extend orders table with shop rating and review columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shop_rating SMALLINT CHECK (shop_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS shop_review TEXT;

-- 3) Re-create order update trigger to permit preparing & ready statuses
CREATE OR REPLACE FUNCTION public.enforce_order_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_customer boolean := (auth.uid() = OLD.customer_id);
  is_runner   boolean := (OLD.runner_id IS NOT NULL AND auth.uid() = OLD.runner_id)
                       OR (OLD.runner_id IS NULL AND NEW.runner_id = auth.uid());
  is_shopkeeper boolean := EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.id = OLD.shop_id AND s.user_id = auth.uid()
  );
BEGIN
  -- Immutable fields for everyone via API
  IF NEW.id <> OLD.id
     OR NEW.customer_id <> OLD.customer_id
     OR NEW.shop_id <> OLD.shop_id
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable order fields';
  END IF;

  -- Runner path: Allow updating status to delivery states
  IF is_runner THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status NOT IN ('picked_up', 'on_the_way', 'delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Runners can only transition status to picked_up, on_the_way, delivered, or cancelled';
      END IF;
    END IF;
    IF NEW.total_amount <> OLD.total_amount
       OR NEW.delivery_fee <> OLD.delivery_fee
       OR NEW.delivery_address IS DISTINCT FROM OLD.delivery_address
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.runner_rating IS DISTINCT FROM OLD.runner_rating
       OR NEW.runner_review IS DISTINCT FROM OLD.runner_review
       OR NEW.shop_rating IS DISTINCT FROM OLD.shop_rating
       OR NEW.shop_review IS DISTINCT FROM OLD.shop_review THEN
      RAISE EXCEPTION 'Runners can only update status and claim assignment';
    END IF;
    RETURN NEW;
  END IF;

  -- Shopkeeper path: Allow preparing, ready, accepted, and cancelled states
  IF is_shopkeeper THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status NOT IN ('accepted', 'preparing', 'ready', 'cancelled') THEN
        RAISE EXCEPTION 'Shopkeepers can only transition status to accepted, preparing, ready, or cancelled';
      END IF;
    END IF;
    IF NEW.runner_id IS DISTINCT FROM OLD.runner_id
       OR NEW.total_amount <> OLD.total_amount
       OR NEW.delivery_fee <> OLD.delivery_fee
       OR NEW.delivery_address IS DISTINCT FROM OLD.delivery_address
       OR NEW.runner_rating IS DISTINCT FROM OLD.runner_rating
       OR NEW.runner_review IS DISTINCT FROM OLD.runner_review
       OR NEW.shop_rating IS DISTINCT FROM OLD.shop_rating
       OR NEW.shop_review IS DISTINCT FROM OLD.shop_review THEN
      RAISE EXCEPTION 'Shopkeepers cannot modify runner, totals, delivery, or ratings fields';
    END IF;
    RETURN NEW;
  END IF;

  -- Customer path: Allow ratings update on delivered orders
  IF is_customer THEN
    IF OLD.status <> 'delivered' THEN
      RAISE EXCEPTION 'Customers can only update delivered orders';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.runner_id IS DISTINCT FROM OLD.runner_id
       OR NEW.total_amount <> OLD.total_amount
       OR NEW.delivery_fee <> OLD.delivery_fee
       OR NEW.delivery_address IS DISTINCT FROM OLD.delivery_address
       OR NEW.notes IS DISTINCT FROM OLD.notes THEN
      RAISE EXCEPTION 'Customers can only update rating fields';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Unauthorized order update';
END;
$$;
