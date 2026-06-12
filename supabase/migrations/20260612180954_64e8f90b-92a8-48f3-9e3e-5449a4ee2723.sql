
-- 1) Privilege escalation: remove user-controlled role insert
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- 2) Signup trigger: create profile + role from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  -- Insert profile (idempotent)
  INSERT INTO public.profiles (user_id, name, email, phone, university)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'university'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Resolve role from metadata, defaulting to student
  BEGIN
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student'::public.app_role);
  EXCEPTION WHEN others THEN
    v_role := 'student'::public.app_role;
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Runner update policy: enforce role + WITH CHECK
DROP POLICY IF EXISTS "Runners can update their assigned orders" ON public.orders;
CREATE POLICY "Runners can update their assigned orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  runner_id = auth.uid()
  AND public.has_role(auth.uid(), 'runner'::public.app_role)
)
WITH CHECK (
  runner_id = auth.uid()
  AND public.has_role(auth.uid(), 'runner'::public.app_role)
);

-- 4) Storage: only shop owner can mutate their product images (path prefix = shop_id)
DROP POLICY IF EXISTS "Shopkeepers can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Shopkeepers can update their product images" ON storage.objects;
DROP POLICY IF EXISTS "Shopkeepers can delete their product images" ON storage.objects;

CREATE POLICY "Shopkeepers can upload their product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.user_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Shopkeepers can update their product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.user_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.user_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Shopkeepers can delete their product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.user_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
);

-- 5) Hide SECURITY DEFINER helpers from API callers (still usable inside RLS policies)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
