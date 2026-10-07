import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, FileText, MousePointerClick, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatLine } from "@/components/data/StatLine";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { descreverAcao, descreverDispositivo, moduloDoArquivo } from "@/lib/acesso-log.shared";
import { cn } from "@/lib/utils";

type Sessao = {
  id: string;
  user_id: string;
  iniciada_em: string;
  ultimo_sinal_em: string;
  encerrada_em: string | null;
  motivo_fim: string | null;
  ip: string | null;
  user_agent: string | null;
  paginas: number;
  acoes: number;
};
type Evento = {
  id: number;
  tipo: "pagina" | "acao";
  rota: string | null;
  titulo: string | null;
  funcao: string | null;
  arquivo: string | null;
  sucesso: boolean;
  erro: string | null;
  created_at: string;
};
type Falha = {
  id: number;
  email: string;
  motivo: string | null;
  ip: string | null;
  created_at: string;
};

const PERIODOS = {
  "1": "Hoje",
  "7": "Últimos 7 dias",
  "30": "Últimos 30 dias",
  "90": "Últimos 90 dias",
};
const ONLINE_MS = 3 * 60_000;
const INATIVA_MS = 30 * 60_000;

const MOTIVO_FALHA: Record<string, string> = {
  invalid_credentials: "Senha errada ou conta inexistente",
  over_request_rate_limit: "Muitas tentativas",
  email_not_confirmed: "E-mail não confirmado",
  user_banned: "Conta desativada",
  AuthRetryableFetchError: "Sem conexão",
};

function desde(dias: string) {
  const d = new Date();
  if (dias === "1") d.setHours(0, 0, 0, 0);
  else d.setDate(d.getDate() - Number(dias));
  return d.toISOString();
}

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

function duracao(ms: number) {
  const min = Math.round(ms / 60_000);
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, "0")} min`;
}

function situacao(s: Sessao, agora: number) {
  const ultimo = new Date(s.ultimo_sinal_em).getTime();
  if (!s.encerrada_em && agora - ultimo < ONLINE_MS)
    return { label: "Online agora", tone: "on" as const };
  if (s.motivo_fim === "logout") return { label: "Saiu", tone: "off" as const };
  if (s.encerrada_em || agora - ultimo >= INATIVA_MS)
    return { label: "Encerrada por inatividade", tone: "off" as const };
  return { label: "Inativa", tone: "idle" as const };
}

export function AcessosTab() {
  const [periodo, setPeriodo] = useState<keyof typeof PERIODOS>("7");
  const [usuario, setUsuario] = useState<string>("todos");
  const [aberta, setAberta] = useState<string | null>(null);

  const perfis = useQuery({
    queryKey: ["acessos", "perfis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const nomePor = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of perfis.data ?? []) m.set(p.id, p.full_name || p.email || "—");
    return m;
  }, [perfis.data]);
  const emailPor = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of perfis.data ?? []) if (p.email) m.set(p.id, p.email);
    return m;
  }, [perfis.data]);

  const sessoes = useQuery({
    queryKey: ["acessos", "sessoes", periodo, usuario],
    refetchInterval: 60_000,
    queryFn: async () => {
      let q = supabase
        .from("acesso_sessoes")
        .select("*")
        .gte("iniciada_em", desde(periodo))
        .order("iniciada_em", { ascending: false })
        .limit(300);
      if (usuario !== "todos") q = q.eq("user_id", usuario);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Sessao[];
    },
  });

  const falhas = useQuery({
    queryKey: ["acessos", "falhas", periodo, usuario, emailPor.get(usuario)],
    queryFn: async () => {
      let q = supabase
        .from("acesso_falhas_login")
        .select("id, email, motivo, ip, created_at")
        .gte("created_at", desde(periodo))
        .order("created_at", { ascending: false })
        .limit(100);
      const email = usuario !== "todos" ? emailPor.get(usuario) : undefined;
      if (email) q = q.eq("email", email.toLowerCase());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Falha[];
    },
  });

  const agora = Date.now();
  const lista = sessoes.data ?? [];
  const online = new Set(
    lista.filter((s) => situacao(s, agora).tone === "on").map((s) => s.user_id),
  ).size;
  const tempoTotal = lista.reduce(
    (t, s) =>
      t +
      (new Date(s.encerrada_em ?? s.ultimo_sinal_em).getTime() - new Date(s.iniciada_em).getTime()),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={usuario} onValueChange={setUsuario}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os usuários</SelectItem>
            {(perfis.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name || p.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as keyof typeof PERIODOS)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PERIODOS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <StatLine
        items={[
          { label: "acessos", value: lista.length },
          { label: "online agora", value: online, tone: online ? "success" : "default" },
          { label: "tempo de uso", value: duracao(tempoTotal) },
          {
            label: "logins recusados",
            value: falhas.data?.length ?? 0,
            tone: (falhas.data?.length ?? 0) > 0 ? "warning" : "default",
          },
        ]}
      />

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-[var(--bg-border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="w-8 px-3 py-2" />
              <th className="px-3 py-2">Usuário</th>
              <th className="px-3 py-2">Entrou</th>
              <th className="px-3 py-2">Ficou</th>
              <th className="px-3 py-2">Situação</th>
              <th className="px-3 py-2 text-right">Páginas</th>
              <th className="px-3 py-2 text-right">Ações</th>
              <th className="px-3 py-2">Dispositivo</th>
            </tr>
          </thead>
          <tbody>
            {sessoes.isLoading && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-[var(--text-muted)]">
                  Carregando…
                </td>
              </tr>
            )}
            {sessoes.isError && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-rose-700">
                  Não foi possível carregar os acessos: {(sessoes.error as Error).message}
                </td>
              </tr>
            )}
            {!sessoes.isLoading && !sessoes.isError && lista.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-[var(--text-muted)]">
                  Nenhum acesso neste período. O registro começou na versão 1.8.5.
                </td>
              </tr>
            )}
            {lista.map((s) => {
              const sit = situacao(s, agora);
              const fim = new Date(s.encerrada_em ?? s.ultimo_sinal_em).getTime();
              const expandida = aberta === s.id;
              return (
                <Fragment key={s.id}>
                  <tr
                    className={cn(
                      "cursor-pointer border-b border-[var(--bg-border)] last:border-0 hover:bg-muted/40",
                      expandida && "bg-muted/40",
                    )}
                    onClick={() => setAberta(expandida ? null : s.id)}
                  >
                    <td className="px-3 py-2.5 text-[var(--text-muted)]">
                      {expandida ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-medium">{nomePor.get(s.user_id) ?? "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums">{dataHora(s.iniciada_em)}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {duracao(fim - new Date(s.iniciada_em).getTime())}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px]",
                          sit.tone === "on" && "border-emerald-300 bg-emerald-50 text-emerald-700",
                        )}
                      >
                        {sit.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{s.paginas}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{s.acoes}</td>
                    <td className="px-3 py-2.5 text-[12.5px] text-[var(--text-muted)]">
                      {descreverDispositivo(s.user_agent)}
                      {s.ip ? ` · ${s.ip}` : ""}
                    </td>
                  </tr>
                  {expandida && (
                    <tr className="border-b border-[var(--bg-border)] bg-muted/20">
                      <td />
                      <td colSpan={7} className="px-3 py-3">
                        <LinhaDoTempo sessaoId={s.id} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {(falhas.data?.length ?? 0) > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
          <div className="border-b border-[var(--bg-border)] px-4 py-2.5 text-sm font-medium">
            Logins recusados
          </div>
          <ul className="divide-y divide-[var(--bg-border)] text-sm">
            {falhas.data!.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
                <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span className="font-medium">{f.email}</span>
                <span className="text-[var(--text-muted)]">
                  {MOTIVO_FALHA[f.motivo ?? ""] ?? f.motivo ?? "Recusado"}
                </span>
                <span className="ml-auto tabular-nums text-[12.5px] text-[var(--text-muted)]">
                  {dataHora(f.created_at)}
                  {f.ip ? ` · ${f.ip}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LinhaDoTempo({ sessaoId }: { sessaoId: string }) {
  const eventos = useQuery({
    queryKey: ["acessos", "eventos", sessaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acesso_eventos")
        .select("id, tipo, rota, titulo, funcao, arquivo, sucesso, erro, created_at")
        .eq("sessao_id", sessaoId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Evento[];
    },
  });

  if (eventos.isLoading) return <p className="text-[13px] text-[var(--text-muted)]">Carregando…</p>;
  if (eventos.isError)
    return <p className="text-[13px] text-rose-700">Não foi possível carregar o que foi feito.</p>;
  if (!eventos.data?.length)
    return (
      <p className="text-[13px] text-[var(--text-muted)]">Nenhuma página ou ação registrada.</p>
    );

  return (
    <ol className="flex flex-col gap-1.5 text-[13px]">
      {eventos.data.map((e) => (
        <li key={e.id} className="flex items-start gap-2">
          <span className="w-16 shrink-0 tabular-nums text-[var(--text-muted)]">
            {hora(e.created_at)}
          </span>
          {e.tipo === "pagina" ? (
            <>
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
              <span className="min-w-0">
                Abriu <span className="font-medium">{e.titulo || e.rota}</span>
                {e.titulo && e.rota && (
                  <span className="ml-1 text-[12px] text-[var(--text-muted)]">{e.rota}</span>
                )}
              </span>
            </>
          ) : (
            <>
              <MousePointerClick
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 shrink-0",
                  e.sucesso ? "text-primary" : "text-rose-600",
                )}
              />
              <span className="min-w-0">
                <span className={cn("font-medium", !e.sucesso && "text-rose-700")}>
                  {descreverAcao(e.funcao)}
                </span>
                {moduloDoArquivo(e.arquivo) && (
                  <span className="ml-1 text-[12px] text-[var(--text-muted)]">
                    em {moduloDoArquivo(e.arquivo)}
                  </span>
                )}
                {!e.sucesso && (
                  <span className="block text-[12px] text-rose-700">
                    Recusado{e.erro ? `: ${e.erro}` : ""}
                  </span>
                )}
              </span>
            </>
          )}
        </li>
      ))}
    </ol>
  );
}
