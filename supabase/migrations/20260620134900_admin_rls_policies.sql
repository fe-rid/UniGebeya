-- ============================================================
-- Migration: Admin RLS Policies for Profiles and User Roles
-- ============================================================

-- 1) Allow admins to select any profile based on JWT user_metadata role
DROP POLICY IF EXISTS "Admins can select any profile" ON public.profiles;
CREATE POLICY "Admins can select any profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'
);

-- 2) Allow admins to update any profile (e.g. role, suspend, name, etc.)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'
)
WITH CHECK (
  ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'
);

-- 3) Allow admins to select any user role
DROP POLICY IF EXISTS "Admins can select any user role" ON public.user_roles;
CREATE POLICY "Admins can select any user role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'
);

-- 4) Allow admins to update/insert any user role
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'
)
WITH CHECK (
  ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'
);
