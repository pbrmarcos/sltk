-- Acesso às credenciais da mineração sem depender da service role.

CREATE OR REPLACE FUNCTION public.mineracao_creds()
RETURNS TABLE (api_base_url text, usuario text, senha text, delay_ms integer)
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
  SELECT c.api_base_url, c.usuario, c.senha, c.delay_ms
    FROM public.mineracao_config c
   WHERE c.singleton = true;
END;
$$;

REVOKE ALL ON FUNCTION public.mineracao_creds() FROM public;
GRANT EXECUTE ON FUNCTION public.mineracao_creds() TO authenticated;

CREATE OR REPLACE FUNCTION public.mineracao_config_admin()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.';
  END IF;

  SELECT jsonb_build_object(
           'api_base_url', c.api_base_url,
           'usuario', c.usuario,
           'senha_definida', (c.senha IS NOT NULL AND c.senha <> ''),
           'pais_padrao', c.pais_padrao,
           'delay_ms', c.delay_ms,
           'limite_consultas_dia', c.limite_consultas_dia,
           'limite_bases', c.limite_bases,
           'limite_bases_premium', c.limite_bases_premium,
           'limite_rubros', c.limite_rubros,
           'limite_empresas', c.limite_empresas,
           'updated_at', c.updated_at
         )
    INTO result
    FROM public.mineracao_config c
   WHERE c.singleton = true;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.mineracao_config_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.mineracao_config_admin() TO authenticated;
