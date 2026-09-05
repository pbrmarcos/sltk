-- Painel Admin v3 — Fundação de segurança
-- 1) audit_log append-only endurecido
-- 2) profiles.disabled + policies
-- 3) count_active_admins()

------------------------------------------------------------
-- 1. audit_log append-only
------------------------------------------------------------

-- Revogar qualquer privilégio de escrita concedido a roles não-service.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_log FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_log FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_log FROM authenticated;

-- Garantir SELECT para authenticated (a policy filtra por role).
GRANT SELECT ON public.audit_log TO authenticated;

-- service_role mantém acesso total (bypassa RLS).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_log TO service_role;

-- Garantir que não existam policies de INSERT/UPDATE/DELETE para authenticated/anon.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_log'
      AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.audit_log', r.policyname);
  END LOOP;
END$$;

-- Confirmar RLS ativa.
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- 2. profiles.disabled
------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disabled_by uuid;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disabled_reason text;

CREATE INDEX IF NOT EXISTS profiles_disabled_idx
  ON public.profiles (disabled)
  WHERE disabled = true;

------------------------------------------------------------
-- 3. count_active_admins()
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.count_active_admins()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'admin'::app_role
    AND p.disabled = false
    AND p.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.count_active_admins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_active_admins() TO authenticated, service_role;

------------------------------------------------------------
-- 4. is_user_active(uuid) — helper para assertActiveUser
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT NOT p.disabled AND p.deleted_at IS NULL
       FROM public.profiles p
       WHERE p.id = _user_id),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_user_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_active(uuid) TO authenticated, service_role;

------------------------------------------------------------
-- 5. get_max_role_rank / assert_can_act_on
------------------------------------------------------------
-- Hierarquia: admin(400) > manager(300) > engineer(200) > outros(100)

CREATE OR REPLACE FUNCTION public.role_rank(_role app_role)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _role
    WHEN 'admin'::app_role      THEN 400
    WHEN 'manager'::app_role    THEN 300
    WHEN 'engineer'::app_role   THEN 200
    ELSE 100
  END;
$$;

REVOKE ALL ON FUNCTION public.role_rank(app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.role_rank(app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.max_role_rank(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(public.role_rank(ur.role)), 0)
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id;
$$;

REVOKE ALL ON FUNCTION public.max_role_rank(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.max_role_rank(uuid) TO authenticated, service_role;
