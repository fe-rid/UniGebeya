-- ============================================================
-- Uni Gebeya Admin Tables Migration
-- Creates: complaints, promotions, campus_zones, audit_logs,
--          platform_settings, and adds is_suspended to profiles
-- ============================================================

-- ─── 1. Add is_suspended column to profiles ─────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

-- ─── 2. Complaints table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    text,
  type        text NOT NULL,
  from_name   text NOT NULL,
  from_user_id uuid,
  description text NOT NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved')),
  response    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can INSERT their own complaint
CREATE POLICY "Authenticated users can insert complaints"
  ON public.complaints FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- Anyone can read all complaints (admin reads all)
CREATE POLICY "Anyone can read complaints"
  ON public.complaints FOR SELECT TO authenticated
  USING (true);

-- Only service_role can update complaints (admin resolve)
-- We use a special admin_role check via user_roles
CREATE POLICY "Admins can update complaints"
  ON public.complaints FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ─── 3. Promotions table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promotions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  discount    numeric NOT NULL,
  type        text NOT NULL DEFAULT 'percent' CHECK (type IN ('percent','flat')),
  expiry      date NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read promos (for checkout validation)
CREATE POLICY "Anyone authenticated can read promotions"
  ON public.promotions FOR SELECT TO authenticated
  USING (true);

-- Only admin can insert/update/delete promos
CREATE POLICY "Admin can manage promotions"
  ON public.promotions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ─── 4. Campus zones table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campus_zones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  parent      text NOT NULL DEFAULT 'Main Campus',
  type        text NOT NULL DEFAULT 'Zone',
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campus_zones ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read zones (for delivery address selection)
CREATE POLICY "Anyone authenticated can read campus zones"
  ON public.campus_zones FOR SELECT TO authenticated
  USING (true);

-- Only admin can manage zones
CREATE POLICY "Admin can manage campus zones"
  ON public.campus_zones FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ─── 5. Audit logs table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action      text NOT NULL,
  details     text NOT NULL,
  performed_by text NOT NULL DEFAULT 'System Admin',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admin can read and insert audit logs
CREATE POLICY "Admin can manage audit logs"
  ON public.audit_logs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ─── 6. Platform settings table ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings
CREATE POLICY "Anyone authenticated can read settings"
  ON public.platform_settings FOR SELECT TO authenticated
  USING (true);

-- Only admin can write settings
CREATE POLICY "Admin can manage settings"
  ON public.platform_settings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ─── 7. Seed default platform settings ──────────────────────
INSERT INTO public.platform_settings (key, value) VALUES
  ('platformName',      'Uni Gebeya'),
  ('commissionPercent', '12'),
  ('baseDeliveryFee',   '30'),
  ('perKmDeliveryFee',  '10'),
  ('systemStatus',      'Optimal')
ON CONFLICT (key) DO NOTHING;

-- ─── 8. Seed default campus zones ───────────────────────────
INSERT INTO public.campus_zones (name, parent, type, status) VALUES
  ('Main Campus East',    'AAU Main',         'Zone',          'active'),
  ('Kilinto Campus',      'AAU Kilinto',       'Zone',          'active'),
  ('Block 5 Dormitories', 'Main Campus East',  'Dorm',          'active'),
  ('Central Library Gate','Main Campus East',  'Pickup Point',  'active')
ON CONFLICT DO NOTHING;

-- ─── 9. Seed default promotions ─────────────────────────────
INSERT INTO public.promotions (code, discount, type, expiry, usage_count) VALUES
  ('STUDYFUEL', 20, 'percent', '2026-07-31', 145),
  ('FREESHIP',  45, 'flat',    '2026-06-30', 320),
  ('WELCOME50', 50, 'flat',    '2026-12-31', 12)
ON CONFLICT (code) DO NOTHING;

-- ─── 10. Allow dev admin access (anon role reads) ────────────
-- In development mode, the admin dashboard runs without auth.
-- Grant SELECT to anon on these tables so the dashboard works
-- without login during development.
GRANT SELECT ON public.promotions      TO anon;
GRANT SELECT ON public.campus_zones    TO anon;
GRANT SELECT ON public.platform_settings TO anon;
GRANT SELECT ON public.complaints      TO anon;
GRANT SELECT ON public.audit_logs      TO anon;
GRANT INSERT ON public.audit_logs      TO anon;
GRANT INSERT ON public.complaints      TO anon;
GRANT ALL    ON public.promotions      TO anon;
GRANT ALL    ON public.campus_zones    TO anon;
GRANT ALL    ON public.platform_settings TO anon;
GRANT ALL    ON public.audit_logs      TO anon;
GRANT ALL    ON public.complaints      TO anon;

-- Allow anon to update profiles.is_suspended (for dev admin suspend)
-- In production this should be restricted to a service role
GRANT UPDATE (is_suspended) ON public.profiles TO anon;
GRANT UPDATE (is_suspended) ON public.profiles TO authenticated;

-- RLS bypass for anon on admin tables (dev only)
CREATE POLICY "Dev admin anon access to promotions"
  ON public.promotions FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Dev admin anon access to campus_zones"
  ON public.campus_zones FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Dev admin anon access to settings"
  ON public.platform_settings FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Dev admin anon access to audit_logs"
  ON public.audit_logs FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Dev admin anon access to complaints"
  ON public.complaints FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Dev admin anon update profiles"
  ON public.profiles FOR UPDATE TO anon
  USING (true) WITH CHECK (true);
