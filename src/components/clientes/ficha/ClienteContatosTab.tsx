/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Globe, Hash, Loader2, Mail, Pencil, Phone, Plus, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FormCollapsibleSection } from "@/components/form/FormCollapsibleSection";
import { FormField } from "@/components/form/FormField";
import { FormGrid } from "@/components/form/FormGrid";
import { addClienteSocio, removerClienteSocio } from "@/lib/clientes.functions";
import {
  RestrictedNotice,
  RevealableValue,
  SensitiveOnly,
  maskDocumento,
  maskEmail,
  maskPhone,
  useSensitiveAccess,
} from "@/lib/sensitive";
import { cn } from "@/lib/utils";
import { EmptyState, FichaSection, fmtDate, type ClienteRow } from "./ficha-utils";

/** Aba Contatos: dados da empresa, pessoas de contato e quadro societário. */
export function ClienteContatosTab({
  cliente,
  contatos,
  socios,
  documentoFmt,
  documentoNome,
}: {
  cliente: ClienteRow;
  contatos: any[];
  socios: any[];
  documentoFmt: string;
  documentoNome: string;
}) {
  const { canSee } = useSensitiveAccess();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = contatos
    .filter(
      (c) =>
        !q ||
        [c.nome, c.cargo, c.email].some((v) =>
          String(v ?? "")
            .toLowerCase()
            .includes(q),
        ),
    )
    .sort((a, b) =>
      a.principal === b.principal
        ? String(a.nome).localeCompare(String(b.nome))
        : a.principal
          ? -1
          : 1,
    );
  const editHref = `/clientes/${cliente.codigo}/editar`;
  const tel = [cliente.telefone_corporativo_ddi, cliente.telefone_corporativo_numero]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border bg-card px-4 py-2.5 text-[12.5px]">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Hash className="h-3.5 w-3.5" /> {documentoNome}{" "}
          <RevealableValue value={documentoFmt} masked={maskDocumento(documentoFmt)} />
        </span>
        {tel && (
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <RevealableValue
              value={tel}
              masked={maskPhone(cliente.telefone_corporativo_numero ?? "")}
            />
          </span>
        )}
        {cliente.email_corporativo &&
          (canSee ? (
            <a
              href={`mailto:${cliente.email_corporativo}`}
              className="inline-flex items-center gap-1.5 hover:underline"
            >
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              {cliente.email_corporativo}
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <RevealableValue
                value={cliente.email_corporativo}
                masked={maskEmail(cliente.email_corporativo)}
              />
            </span>
          ))}
        {cliente.site && (
          <a
            href={cliente.site.startsWith("http") ? cliente.site : `https://${cliente.site}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:underline"
          >
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            {cliente.site}
          </a>
        )}
        {!tel && !cliente.email_corporativo && !cliente.site && (
          <span className="text-muted-foreground">
            Sem telefone, e-mail ou site da empresa — complete na aba Visão.
          </span>
        )}
      </div>

      <FichaSection
        title={`Contatos (${contatos.length})`}
        action={
          <div className="flex items-center gap-2">
            {contatos.length > 5 && (
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="h-8 w-40 text-[12px]"
              />
            )}
            <Button asChild size="sm" variant="outline" className="h-8">
              <Link to={editHref}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Link>
            </Button>
          </div>
        }
      >
        {contatos.length === 0 ? (
          <EmptyState icon={Users} title="Sem contatos" hint="Adicione pelo botão Editar." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum contato na busca" />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((c) => {
              const t = [c.telefone_ddi, c.telefone_numero].filter(Boolean).join(" ");
              return (
                <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20">
                  <div
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white",
                      c.principal
                        ? "bg-gradient-to-br from-amber-500 to-amber-700"
                        : "bg-[var(--neutral)]",
                    )}
                  >
                    {String(c.nome)
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[12.5px] font-semibold">{c.nome}</span>
                      {c.principal && (
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                        >
                          Principal
                        </Badge>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {c.cargo ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {t && (
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                        <a href={`tel:${t.replace(/\s+/g, "")}`}>
                          <Phone className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">{t}</span>
                        </a>
                      </Button>
                    )}
                    {c.email && (
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                        <a href={`mailto:${c.email}`}>
                          <Mail className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">{c.email}</span>
                        </a>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </FichaSection>

      <SensitiveOnly fallback={<RestrictedNotice what="Quadro societário" />}>
        <SociosSection clienteId={cliente.id} codigo={cliente.codigo} socios={socios} />
      </SensitiveOnly>
    </div>
  );
}

function SociosSection({
  clienteId,
  codigo,
  socios,
}: {
  clienteId: string;
  codigo: string;
  socios: any[];
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [nome, setNome] = useState("");
  const [qualificacao, setQualificacao] = useState("");
  const [desde, setDesde] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; nome: string } | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["clientes", "detail-codigo", codigo] });
    qc.invalidateQueries({ queryKey: ["clientes", clienteId, "timeline"] });
  };
  const addMut = useMutation({
    mutationFn: () =>
      addClienteSocio({
        data: {
          clienteId,
          nome: nome.trim(),
          qualificacao: qualificacao.trim() || null,
          desde: desde || null,
        },
      }),
    onSuccess: () => {
      toast.success("Sócio adicionado.");
      setNome("");
      setQualificacao("");
      setDesde("");
      setErro(null);
      setAdding(false);
      invalidate();
    },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : "Falha ao adicionar."),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => removerClienteSocio({ data: { id } }),
    onSuccess: () => {
      toast.success("Sócio removido.");
      setConfirmTarget(null);
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao remover."),
  });

  function validar() {
    const n = nome.trim();
    if (n.length < 2) return "Informe o nome.";
    if (socios.some((s) => (s.nome ?? "").trim().toLowerCase() === n.toLowerCase()))
      return "Este sócio já está na lista.";
    if (desde && new Date(desde).getTime() > Date.now()) return "Data não pode ser futura.";
    return null;
  }

  return (
    <FormCollapsibleSection
      title="Sócios"
      count={String(socios.length)}
      defaultOpen={socios.length > 0}
      right={
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      }
    >
      {adding && (
        <div className="mb-3 rounded-lg border bg-muted/20 p-3">
          <FormGrid cols={3}>
            <FormField label="Nome" required error={erro}>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={180} />
            </FormField>
            <FormField label="Qualificação">
              <Input
                value={qualificacao}
                onChange={(e) => setQualificacao(e.target.value)}
                maxLength={120}
                placeholder="Sócio-administrador"
              />
            </FormField>
            <FormField label="Desde">
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </FormField>
          </FormGrid>
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={addMut.isPending}
              onClick={() => {
                const e = validar();
                if (e) return setErro(e);
                addMut.mutate();
              }}
            >
              {addMut.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      )}
      {socios.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          Nenhum sócio. O Minerar dados traz o quadro da Receita quando houver CNPJ.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {socios.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-medium">{s.nome}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {s.qualificacao ?? "—"}
                  {s.desde ? ` · desde ${fmtDate(s.desde)}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmTarget({ id: s.id, nome: s.nome ?? "Sócio" })}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Remover ${s.nome ?? ""}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <AlertDialog
        open={!!confirmTarget}
        onOpenChange={(o) => !o && !delMut.isPending && setConfirmTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover sócio?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmTarget?.nome}</strong> sai da lista; a ação fica registrada no
              histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmTarget) delMut.mutate(confirmTarget.id);
              }}
              disabled={delMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormCollapsibleSection>
  );
}
