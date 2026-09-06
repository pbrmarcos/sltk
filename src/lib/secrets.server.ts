/**
 * Leitura/escrita de credenciais de integração — variável de ambiente
 * primeiro (compatibilidade com quem já está configurado via Coolify),
 * com fallback/gravação no Supabase Vault (`vault_get_secret` etc.,
 * migration 20260905130000_secrets_vault.sql). Nunca expõe o valor
 * decriptado além do necessário — quem chama decide o que fazer com ele.
 */

/** Lê uma credencial: variável de ambiente primeiro, senão o Vault. */
export async function getSecret(name: string): Promise<string | null> {
  const fromEnv = process.env[name];
  if (fromEnv && fromEnv.trim()) return fromEnv;

  try {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const admin = await getCriticalClient();
    const { data, error } = await (admin as any).rpc("vault_get_secret", { secret_name: name });
    if (error) {
      console.error("[secrets] vault_get_secret falhou", name, error.message);
      return null;
    }
    return typeof data === "string" && data.trim() ? data : null;
  } catch {
    // Sem service role neste ambiente (ex.: dev local) — só a env var conta.
    return null;
  }
}

/** Existência sem decriptar — usado pelo diagnóstico pra evitar decriptar à toa. */
export async function secretExists(name: string): Promise<boolean> {
  if (process.env[name]?.trim()) return true;
  try {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const admin = await getCriticalClient();
    const { data, error } = await (admin as any).rpc("vault_secret_exists", {
      secret_name: name,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

/** Grava/atualiza uma credencial no Vault (nunca na env var — essa é só leitura). */
export async function setSecret(name: string, value: string): Promise<void> {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
  const admin = await getCriticalClient();
  const { error } = await (admin as any).rpc("vault_upsert_secret", {
    secret_name: name,
    secret_value: value,
  });
  if (error) throw new Error(`Não foi possível salvar a credencial: ${error.message}`);
}

/** Remove uma credencial do Vault (volta a depender só da env var, se houver). */
export async function deleteSecret(name: string): Promise<void> {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
  const admin = await getCriticalClient();
  const { error } = await (admin as any).rpc("vault_delete_secret", { secret_name: name });
  if (error) throw new Error(`Não foi possível remover a credencial: ${error.message}`);
}
