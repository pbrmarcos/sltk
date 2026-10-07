/**
 * Logs de acesso (lado do navegador): abre/renova a sessão de uso, registra
 * páginas abertas e encerra no logout. As ações (funções do servidor) são
 * registradas pelo middleware global em `acesso-log.middleware.ts`.
 *
 * Tudo aqui é "melhor esforço": uma falha de registro nunca atrapalha o uso.
 */
import { supabase } from "@/integrations/supabase/client";

const KEY = "sltk:sessao-acesso";
export const SESSAO_HEADER = "x-sessao-acesso";

type Guardada = { id: string; userId: string };

function ler(): Guardada | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Guardada) : null;
  } catch {
    return null;
  }
}

function gravar(v: Guardada | null) {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {
    /* sem storage: segue sem sessão */
  }
}

/** Id da sessão atual (para o cabeçalho das chamadas ao servidor). */
export function sessaoAcessoAtual(): string | null {
  if (typeof window === "undefined") return null;
  return ler()?.id ?? null;
}

type Rpc = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: unknown }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

/**
 * Abre a sessão ou renova a atual (o banco reaproveita a mesma se o último
 * sinal tem menos de 30 min). Serve também como "sinal de vida".
 */
export async function manterSessaoAcesso(userId: string) {
  const atual = ler();
  const anterior = atual?.userId === userId ? atual.id : null;
  const { data, error } = await rpc("acesso_iniciar_sessao", {
    _sessao: anterior,
    _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });
  if (!error && typeof data === "string") gravar({ id: data, userId });
}

export async function registrarPaginaAcesso(rota: string, titulo: string) {
  const id = sessaoAcessoAtual();
  if (!id) return;
  await rpc("acesso_registrar_pagina", { _sessao: id, _rota: rota, _titulo: titulo });
}

export async function encerrarSessaoAcesso() {
  const id = sessaoAcessoAtual();
  gravar(null);
  if (!id) return;
  try {
    await rpc("acesso_encerrar", { _sessao: id });
  } catch {
    /* ignora */
  }
}

/** Tentativa de login recusada (pode ser chamada sem sessão). */
export async function registrarFalhaLogin(email: string, motivo: string) {
  try {
    await rpc("acesso_registrar_falha_login", {
      _email: email,
      _motivo: motivo,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    /* ignora */
  }
}
