/**
 * Traduz um erro cru do Postgres/Supabase (código SQLSTATE + mensagem técnica)
 * numa mensagem segura para o usuário final. O erro original é sempre logado
 * no servidor antes — nada se perde para depuração, só não vaza pro cliente.
 *
 * Uso: troque `throw new Error(error.message)` por `throw friendlyDbError(error)`
 * em qualquer handler de `createServerFn` que repasse um erro do Supabase.
 */

const CODE_MESSAGES: Record<string, string> = {
  "23505": "Já existe um registro com esses dados.",
  "23503": "Não é possível concluir: há registros vinculados a este item.",
  "23502": "Preencha os campos obrigatórios antes de salvar.",
  "23514": "Um dos valores informados não é permitido.",
  "22P02": "Um dos valores informados está em formato inválido.",
  "42501": "Você não tem permissão para executar esta ação.",
};

const FALLBACK_MESSAGE =
  "Não foi possível completar a operação. Tente novamente ou contate o suporte.";

export function friendlyDbError(
  error: { message: string; code?: string | null } | null | undefined,
  fallback: string = FALLBACK_MESSAGE,
): Error {
  if (error) console.error("[db]", error.code ?? "sem código", error.message);
  const mapped = error?.code ? CODE_MESSAGES[error.code] : undefined;
  return new Error(mapped ?? fallback);
}
