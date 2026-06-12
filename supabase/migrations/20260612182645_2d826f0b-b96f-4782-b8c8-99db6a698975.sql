
-- 1) profiles: remove client INSERT (trigger-only creation)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- 2) storage policies: use objects.name, not shops.name
DROP POLICY IF EXISTS "Shopkeepers can upload their product images" ON storage.objects;
DROP POLICY IF EXISTS "Shopkeepers can update their product images" ON storage.objects;
DROP POLICY IF EXISTS "Shopkeepers can delete their product images" ON storage.objects;

CREATE POLICY "Shopkeepers can upload their product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.user_id = auth.uid()
      AND (s.id)::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Shopkeepers can update their product images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.user_id = auth.uid()
      AND (s.id)::text = (storage.foldername(storage.objects.name))[1]
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.user_id = auth.uid()
      AND (s.id)::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Shopkeepers can delete their product images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.user_id = auth.uid()
      AND (s.id)::text = (storage.foldername(storage.objects.name))[1]
  )
);

-- 3 + 4) orders: enforce column-level update restrictions via trigger
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

  -- Runner path: runner role updates are validated by RLS; allow status/runner_id changes
  IF is_runner THEN
    IF NEW.total_amount <> OLD.total_amount
       OR NEW.delivery_fee <> OLD.delivery_fee
       OR NEW.delivery_address IS DISTINCT FROM OLD.delivery_address
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.runner_rating IS DISTINCT FROM OLD.runner_rating
       OR NEW.runner_review IS DISTINCT FROM OLD.runner_review THEN
      RAISE EXCEPTION 'Runners can only update status and claim assignment';
    END IF;
    RETURN NEW;
  END IF;

  -- Shopkeeper path: only allow status transition pending -> accepted
  IF is_shopkeeper THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (OLD.status = 'pending' AND NEW.status = 'accepted') THEN
        RAISE EXCEPTION 'Shopkeepers can only accept pending orders';
      END IF;
    END IF;
    IF NEW.runner_id IS DISTINCT FROM OLD.runner_id
       OR NEW.total_amount <> OLD.total_amount
       OR NEW.delivery_fee <> OLD.delivery_fee
       OR NEW.delivery_address IS DISTINCT FROM OLD.delivery_address
       OR NEW.runner_rating IS DISTINCT FROM OLD.runner_rating
       OR NEW.runner_review IS DISTINCT FROM OLD.runner_review THEN
      RAISE EXCEPTION 'Shopkeepers cannot modify runner, totals, delivery, or rating fields';
    END IF;
    RETURN NEW;
  END IF;

  -- Customer path: only rating/review changes allowed on delivered orders
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

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_order_update_rules() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_order_update_rules_trg ON public.orders;
CREATE TRIGGER enforce_order_update_rules_trg
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_order_update_rules();
