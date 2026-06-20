-- ============================================================
-- Migration: Admin RLS Policies for Profiles and User Roles
-- ============================================================

-- 1) Allow admins to select any profile
DROP POLICY IF EXISTS "Admins can select any profile" ON public.profiles;
CREATE POLICY "Admins can select any profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 2) Allow admins to update any profile (e.g. role, suspend, name, etc.)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 3) Allow admins to select any user role
DROP POLICY IF EXISTS "Admins can select any user role" ON public.user_roles;
CREATE POLICY "Admins can select any user role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 4) Allow admins to update/insert any user role
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);
