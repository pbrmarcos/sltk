-- Cofre de credenciais de integração (Resend, Gemini, Google Service
-- Account, SB_MANAGEMENT_ACCESS_TOKEN etc.) — hoje 100% variável de
-- ambiente (só editável no Coolify, fora do app). Usa o Supabase Vault
-- (pgsodium) — criptografia em repouso nativa da plataforma, não uma
-- tabela própria reinventando isso.
--
-- vault.create_secret/update_secret/decrypted_secrets vivem no schema
-- `vault`, que o PostgREST não expõe — as 4 funções abaixo, no schema
-- `public` e SECURITY DEFINER, são o único jeito de service_role (via
-- getCriticalClient()) alcançar o Vault a partir do supabase-js. Nunca
-- concedidas a authenticated/anon: só o servidor (service_role) chama.

CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;

CREATE OR REPLACE FUNCTION public.vault_upsert_secret(secret_name text, secret_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = secret_name;
  IF existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(existing_id, secret_value);
  ELSE
    PERFORM vault.create_secret(secret_value, secret_name);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.vault_delete_secret(secret_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE name = secret_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.vault_get_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v text;
BEGIN
  SELECT decrypted_secret INTO v FROM vault.decrypted_secrets WHERE name = secret_name;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.vault_secret_exists(secret_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM vault.secrets WHERE name = secret_name);
END;
$$;

REVOKE ALL ON FUNCTION public.vault_upsert_secret(text, text) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.vault_delete_secret(text) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.vault_get_secret(text) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.vault_secret_exists(text) FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.vault_upsert_secret(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.vault_delete_secret(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.vault_get_secret(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.vault_secret_exists(text) TO service_role;
