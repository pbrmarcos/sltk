
REVOKE ALL ON FUNCTION public.can_access_processo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tg_processos_audit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_processos_set_codigo() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_processos_set_updated_by() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_processo(uuid) TO authenticated, service_role;
