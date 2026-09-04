-- Snapshot das restrições reais da Penta (GET /restrictions), acessível ao time comercial.
CREATE OR REPLACE FUNCTION public.mineracao_restricoes_get()
RETURNS TABLE(snapshot jsonb, atualizado_em timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_access_module(auth.uid(), 'comercial')
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'manager') THEN
    RAISE EXCEPTION 'Acesso restrito ao time comercial.';
  END IF;

  RETURN QUERY
    SELECT c.restricoes_sync, c.restricoes_sync_at
      FROM public.mineracao_config c
     WHERE c.singleton = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.mineracao_restricoes_set(_snapshot jsonb)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF NOT public.can_access_module(auth.uid(), 'comercial')
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'manager') THEN
    RAISE EXCEPTION 'Acesso restrito ao time comercial.';
  END IF;

  UPDATE public.mineracao_config
     SET restricoes_sync = _snapshot,
         restricoes_sync_at = v_now
   WHERE singleton = true;

  RETURN v_now;
END;
$$;

REVOKE ALL ON FUNCTION public.mineracao_restricoes_get() FROM public;
REVOKE ALL ON FUNCTION public.mineracao_restricoes_set(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.mineracao_restricoes_get() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mineracao_restricoes_set(jsonb) TO authenticated;
