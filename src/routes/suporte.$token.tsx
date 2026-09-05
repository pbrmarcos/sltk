import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChamadoChat, type ChatMensagem } from "@/components/suporte/ChamadoChat";
import { ChamadoStatusBadge } from "@/components/suporte/ChamadoStatusBadge";
import { useSuporteT } from "@/components/suporte/PublicShell";
import { PublicSiteShell } from "@/components/site/PublicSiteShell";

import {
  publicAcaoChamado,
  publicEnviarMensagem,
  publicGetChamado,
} from "@/lib/suporte-publico.functions";

export const Route = createFileRoute("/suporte/$token")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Chamado de suporte — Solutek" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <PublicSiteShell>
      <PublicChamadoChatPage />
    </PublicSiteShell>
  ),
});

function PublicChamadoChatPage() {
  const { t } = useSuporteT();
  const { token } = useParams({ from: "/suporte/$token" });
  const qc = useQueryClient();
  const getFn = useServerFn(publicGetChamado);
  const sendFn = useServerFn(publicEnviarMensagem);
  const acaoFn = useServerFn(publicAcaoChamado);

  const q = useQuery({
    queryKey: ["public-chamado", token],
    queryFn: () => getFn({ data: { token } }),
    refetchInterval: 15000,
    retry: false,
  });

  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await sendFn({ data: { token, conteudo: texto.trim() } });
      setTexto("");
      await qc.invalidateQueries({ queryKey: ["public-chamado", token] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errors.generic);
    } finally {
      setEnviando(false);
    }
  }

  async function acao(acao: "resolver" | "reabrir") {
    try {
      await acaoFn({ data: { token, acao } });
      await qc.invalidateQueries({ queryKey: ["public-chamado", token] });
      toast.success(acao === "resolver" ? t.chat.resolve : t.chat.reopen);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errors.generic);
    }
  }

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center text-slate-500">
        {t.chat.loading}
      </div>
    );
  }
  if (q.error || !q.data) {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">{t.chat.notFoundTitle}</h1>
          <p className="mt-2 text-sm text-slate-600">{t.chat.notFoundBody}</p>
          <div className="mt-4 flex gap-2">
            <Button asChild variant="outline">
              <Link to="/suporte">{t.chat.backToConsult}</Link>
            </Button>
            <Button asChild>
              <Link to="/suporte">{t.chat.openNew}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { chamado, mensagens } = q.data;
  const encerrado = chamado.status === "resolvido" || chamado.status === "arquivado";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t.chat.ticket}
          </div>
          <div className="mt-0.5 font-mono text-xl font-bold tracking-wider text-slate-900">
            {chamado.codigo}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            {chamado.assunto ?? t.chat.subject} · {t.chat.serial} {chamado.numero_serie}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {t.chat.openedAt} {new Date(chamado.created_at).toLocaleString()}
          </div>
        </div>
        <ChamadoStatusBadge status={chamado.status} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <ChamadoChat mensagens={mensagens as ChatMensagem[]} viewpoint="visitor" />

        {encerrado ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <span>
              {t.chat.closedNotice} <strong>{chamado.status}</strong>.
            </span>
            <Button size="sm" variant="outline" onClick={() => acao("reabrir")}>
              {t.chat.reopen}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              rows={3}
              maxLength={4000}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={t.chat.placeholder}
            />
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => acao("resolver")}
                className="text-emerald-700"
              >
                {t.chat.resolve}
              </Button>
              <Button onClick={enviar} disabled={enviando || !texto.trim()}>
                {enviando ? t.chat.sending : t.chat.send}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
