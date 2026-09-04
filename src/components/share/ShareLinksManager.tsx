import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShareLinkDialog } from "@/components/share/ShareLinkDialog";
import { listShareLinks, revokeShareLink, listShareSubmissoes } from "@/lib/share-links.functions";
import { Share2, Ban, Link as LinkIcon, History } from "lucide-react";

type Props = { tipo: "fat" | "sat"; relatorioId: string; relatorioCodigo?: string | null };

export function ShareLinksManager({ tipo, relatorioId, relatorioCodigo }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listShareLinks);
  const subsFn = useServerFn(listShareSubmissoes);
  const revokeFn = useServerFn(revokeShareLink);
  const [shareOpen, setShareOpen] = useState(false);

  const linksQ = useQuery({
    queryKey: ["share-links", tipo, relatorioId],
    queryFn: () => listFn({ data: { tipo, relatorio_id: relatorioId } }),
  });
  const subsQ = useQuery({
    queryKey: ["share-submissoes", tipo, relatorioId],
    queryFn: () => subsFn({ data: { tipo, relatorio_id: relatorioId, limit: 100 } }),
  });

  async function revoke(id: string) {
    if (!window.confirm("Revogar este link? Não poderá mais ser usado em campo.")) return;
    try {
      await revokeFn({ data: { id } });
      toast.success("Link revogado");
      qc.invalidateQueries({ queryKey: ["share-links", tipo, relatorioId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao revogar");
    }
  }

  const links = (linksQ.data ?? []) as Array<{
    id: string; rotulo: string | null; scope: string[];
    created_by_nome: string | null; created_at: string;
    expires_at: string; revoked_at: string | null; revoked_by_nome: string | null;
    last_used_at: string | null; use_count: number;
  }>;
  const subs = (subsQ.data ?? []) as Array<{
    id: string; share_link_id: string; acao: string; alvo_id: string | null;
    payload: Record<string, unknown> | null; signatario_nome: string | null;
    signatario_cargo: string | null; status: string; created_at: string;
    ip: string | null; user_agent: string | null;
  }>;

  const ACAO_LABEL: Record<string, string> = {
    visualizacao: "Visualização",
    checklist_resposta: "Checklist",
    assinatura: "Assinatura",
    pdf_export: "Exportação PDF",
  };


  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Links de campo emitidos</h3>
          </div>
          <Button size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="mr-1.5 h-4 w-4" /> Novo link
          </Button>
        </div>

        {linksQ.isLoading ? (
          <p className="text-sm text-[var(--text-muted)]">Carregando…</p>
        ) : links.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Nenhum link emitido ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="py-2 pr-3">Emitido</th>
                  <th className="py-2 pr-3">Por</th>
                  <th className="py-2 pr-3">Expira</th>
                  <th className="py-2 pr-3">Escopo</th>
                  <th className="py-2 pr-3">Usos</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => {
                  const active = !l.revoked_at && new Date(l.expires_at).getTime() > Date.now();
                  return (
                    <tr key={l.id} className="border-t border-[var(--border)]">
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                      <td className="py-2 pr-3">{l.created_by_nome ?? "—"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(l.expires_at).toLocaleString("pt-BR")}</td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {l.scope.map((s) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                        </div>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{l.use_count}</td>
                      <td className="py-2 pr-3">
                        {l.revoked_at
                          ? <Badge variant="destructive">Revogado</Badge>
                          : active
                            ? <Badge>Ativo</Badge>
                            : <Badge variant="secondary">Expirado</Badge>}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {!l.revoked_at && (
                          <Button size="sm" variant="ghost" onClick={() => revoke(l.id)}>
                            <Ban className="mr-1 h-3.5 w-3.5" /> Revogar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Submissões feitas via link público</h3>
        </div>

        {subsQ.isLoading ? (
          <p className="text-sm text-[var(--text-muted)]">Carregando…</p>
        ) : subs.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Nenhuma submissão registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="py-2 pr-3">Quando</th>
                  <th className="py-2 pr-3">Ação</th>
                  <th className="py-2 pr-3">Signatário</th>
                  <th className="py-2 pr-3">Detalhes</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-t border-[var(--border)]">
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(s.created_at).toLocaleString("pt-BR")}</td>
                    <td className="py-2 pr-3"><Badge variant="outline">{ACAO_LABEL[s.acao] ?? s.acao}</Badge></td>
                    <td className="py-2 pr-3">
                      {s.signatario_nome
                        ? <span>{s.signatario_nome}{s.signatario_cargo ? <span className="text-[var(--text-muted)]"> · {s.signatario_cargo}</span> : null}</span>
                        : "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs text-[var(--text-muted)]">
                      {s.alvo_id && <span className="mr-2">item: {s.alvo_id.slice(0, 8)}…</span>}
                      {s.payload && (s.payload as any).status ? <span className="mr-2">status: {String((s.payload as any).status)}</span> : null}
                      {s.payload && (s.payload as any).codigo ? <span className="mr-2">doc: {String((s.payload as any).codigo)} v{String((s.payload as any).versao ?? "")}</span> : null}
                      {s.payload && (s.payload as any).motivo ? <span className="mr-2">motivo: {String((s.payload as any).motivo)}</span> : null}
                      {s.ip ? <span className="mr-2">ip: {s.ip}</span> : null}
                    </td>
                    <td className="py-2 pr-3">
                      {s.status === "aplicada" ? <Badge>Aplicada</Badge> : <Badge variant="destructive">Rejeitada</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>


      <ShareLinkDialog
        open={shareOpen}
        onOpenChange={(v) => {
          setShareOpen(v);
          if (!v) qc.invalidateQueries({ queryKey: ["share-links", tipo, relatorioId] });
        }}
        tipo={tipo}
        relatorioId={relatorioId}
        relatorioCodigo={relatorioCodigo ?? null}
      />
    </div>
  );
}
