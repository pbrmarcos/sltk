ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET must_change_password = true
WHERE lower(email) IN ('comercial@sltkamericas.com','campo@sltkamericas.com','montagem@sltkamericas.com','compras@sltkamericas.com','producao@sltkamericas.com','engenharia@sltkamericas.com','gestor@sltkamericas.com');
CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET must_change_password = false WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.clear_must_change_password() FROM public;
GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;
