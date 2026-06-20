-- ============================================================
-- Migration: Secure Role-Based Auth and Profiles Schema Updates
-- ============================================================

-- 1) Extend profiles table with role, full_name, and phone_number
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL DEFAULT 'student'::public.app_role,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 2) Update existing records to sync names, phones, and roles
UPDATE public.profiles p
SET 
  full_name = name,
  phone_number = phone;

UPDATE public.profiles p
SET role = ur.role
FROM public.user_roles ur
WHERE p.user_id = ur.user_id;

-- 3) Create a function and trigger to keep name/full_name and phone/phone_number in sync
CREATE OR REPLACE FUNCTION public.sync_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sync name and full_name
  IF NEW.full_name IS NULL AND NEW.name IS NOT NULL THEN
    NEW.full_name := NEW.name;
  ELSIF NEW.name IS NULL AND NEW.full_name IS NOT NULL THEN
    NEW.name := NEW.full_name;
  ELSIF (TG_OP = 'UPDATE') AND NEW.name IS DISTINCT FROM OLD.name AND (NEW.full_name IS NOT DISTINCT FROM OLD.full_name OR NEW.full_name IS NULL) THEN
    NEW.full_name := NEW.name;
  ELSIF (TG_OP = 'UPDATE') AND NEW.full_name IS DISTINCT FROM OLD.full_name AND (NEW.name IS NOT DISTINCT FROM OLD.name OR NEW.name IS NULL) THEN
    NEW.name := NEW.full_name;
  END IF;

  -- Sync phone and phone_number
  IF NEW.phone_number IS NULL AND NEW.phone IS NOT NULL THEN
    NEW.phone_number := NEW.phone;
  ELSIF NEW.phone IS NULL AND NEW.phone_number IS NOT NULL THEN
    NEW.phone := NEW.phone_number;
  ELSIF (TG_OP = 'UPDATE') AND NEW.phone IS DISTINCT FROM OLD.phone AND (NEW.phone_number IS NOT DISTINCT FROM OLD.phone_number OR NEW.phone_number IS NULL) THEN
    NEW.phone_number := NEW.phone;
  ELSIF (TG_OP = 'UPDATE') AND NEW.phone_number IS DISTINCT FROM OLD.phone_number AND (NEW.phone IS NOT DISTINCT FROM OLD.phone OR NEW.phone IS NULL) THEN
    NEW.phone := NEW.phone_number;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_columns_trg ON public.profiles;
CREATE TRIGGER sync_profile_columns_trg
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_columns();

-- 4) Update handle_new_user trigger to handle the role column and auto-assign admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  -- Resolve role: admin@unigebeya.com always becomes admin.
  -- Otherwise, default to student (no client-side overrides).
  IF NEW.email = 'admin@unigebeya.com' THEN
    v_role := 'admin'::public.app_role;
  ELSE
    v_role := 'student'::public.app_role;
  END IF;

  -- Insert profile (idempotent)
  INSERT INTO public.profiles (user_id, name, full_name, email, phone, phone_number, university, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'university',
    v_role
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert into legacy user_roles for backward compatibility
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 5) Update has_role helper function to check profiles.role instead of user_roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
