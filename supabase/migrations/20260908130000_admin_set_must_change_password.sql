-- RPC aditiva: permite ao admin marcar/desmarcar must_change_password de
-- outro usuário (ex.: ao criar uma conta com senha provisória, ou ao
-- resetar a senha de alguém). Não mexe nas RPCs admin_finalize_new_user /
-- admin_set_user_password já existentes no banco remoto (usadas no caminho
-- de fallback sem service role) -- o corpo delas não está neste repo.

CREATE OR REPLACE FUNCTION public.admin_set_must_change_password(_user_id uuid, _value boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles SET must_change_password = _value WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_must_change_password(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_must_change_password(uuid, boolean) TO authenticated;
