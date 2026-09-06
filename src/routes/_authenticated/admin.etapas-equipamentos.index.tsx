/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Plus, Copy, Eye, EyeOff, Trash2, ExternalLink, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccessDenied } from "@/components/layout/AccessDenied";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  listEtapaTemplates,
  createEtapaTemplate,
  duplicateEtapaTemplate,
  updateEtapaTemplate,
  deleteEtapaTemplate,
  listRfqTiposForTemplate,
} from "@/lib/etapa-templates.functions";

export const Route = createFileRoute("/_authenticated/admin/etapas-equipamentos/")({
  component: Page,
});

function Page() {
  const { role } = useAuth();
  const authorized = role === "admin" || role === "manager" || role === "engineer";
  if (!authorized) {
    return (
      <PageContainer>
        <AccessDenied message="Esta área é exclusiva para administradores, gestores e engenharia." />
      </PageContainer>
    );
  }

  return <EtapasEquipamentosPanel />;
}

function EtapasEquipamentosPanel() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "sim" | "nao">("todos");
  const [openNovo, setOpenNovo] = useState(false);
  const [dup, setDup] = useState<{ id: string; nome: string } | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["etapa-tpl-list", q, filtro],
    queryFn: () => listEtapaTemplates({ data: { q, publicado: filtro } }),
  });

  const togglePubMut = useMutation({
    mutationFn: (v: { id: string; publicado: boolean }) => updateEtapaTemplate({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etapa-tpl-list"] });
      toast.success("Status atualizado.");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEtapaTemplate({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etapa-tpl-list"] });
      toast.success("Template removido.");
    },
  });

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Etapas dos Equipamentos" }]}
        title="Etapas dos Equipamentos"
        subtitle="Templates de etapas por tipo de equipamento. Editar aqui reflete em novos equipamentos criados a partir de orçamentos aprovados."
        actions={
          <Button size="sm" onClick={() => setOpenNovo(true)}>
            <Plus className="mr-1 h-4 w-4" /> Novo template
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, slug ou família…"
            className="pl-8"
          />
        </div>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="sim">Publicados</SelectItem>
            <SelectItem value="nao">Rascunhos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Família</th>
              <th className="px-3 py-2 text-left">Etapas</th>
              <th className="px-3 py-2 text-left">Versão</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhum template.
                </td>
              </tr>
            )}
            {rows.map((r: any) => (
              <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.nome}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.slug}</td>
                <td className="px-3 py-2">
                  {r.familia ? <Badge variant="secondary">{r.familia}</Badge> : "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.total_etapas}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">v{r.versao_atual}</td>
                <td className="px-3 py-2">
                  {r.publicado ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">
                      Publicado
                    </Badge>
                  ) : (
                    <Badge variant="outline">Rascunho</Badge>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/admin/etapas-equipamentos/$id" params={{ id: r.id }}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDup({ id: r.id, nome: r.nome })}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => togglePubMut.mutate({ id: r.id, publicado: !r.publicado })}
                    >
                      {r.publicado ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Remover "${r.nome}"?`)) deleteMut.mutate(r.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NovoDialog
        open={openNovo}
        onOpenChange={setOpenNovo}
        onCreated={() => qc.invalidateQueries({ queryKey: ["etapa-tpl-list"] })}
      />
      {dup && (
        <DuplicarDialog
          origem={dup}
          onOpenChange={(o) => !o && setDup(null)}
          onDuplicated={() => {
            setDup(null);
            qc.invalidateQueries({ queryKey: ["etapa-tpl-list"] });
          }}
        />
      )}
    </PageContainer>
  );
}

function NovoDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [familia, setFamilia] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoId, setTipoId] = useState<string>("");
  const { data: tipos = [] } = useQuery({
    queryKey: ["rfq-tipos-tpl"],
    queryFn: () => listRfqTiposForTemplate(),
  });
  const createMut = useMutation({
    mutationFn: () =>
      createEtapaTemplate({
        data: {
          nome,
          slug,
          familia: familia || undefined,
          descricao: descricao || undefined,
          tipoId: tipoId || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Template criado.");
      onCreated();
      onOpenChange(false);
      setNome("");
      setSlug("");
      setFamilia("");
      setDescricao("");
      setTipoId("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo template de etapas</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Slug (único)</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              placeholder="ex: envasadora-liquidos"
            />
          </div>
          <div>
            <Label>Tipo Checklist vinculado (opcional)</Label>
            <Select value={tipoId} onValueChange={setTipoId}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                {(tipos as any[]).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome_pt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Família</Label>
            <Input
              value={familia}
              onChange={(e) => setFamilia(e.target.value)}
              placeholder="ex: empacotamento"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => createMut.mutate()}
            disabled={!nome || !slug || createMut.isPending}
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DuplicarDialog({
  origem,
  onOpenChange,
  onDuplicated,
}: {
  origem: { id: string; nome: string };
  onOpenChange: (v: boolean) => void;
  onDuplicated: () => void;
}) {
  const [nome, setNome] = useState(`${origem.nome} (cópia)`);
  const [slug, setSlug] = useState("");
  const mut = useMutation({
    mutationFn: () =>
      duplicateEtapaTemplate({ data: { id: origem.id, novoNome: nome, novoSlug: slug } }),
    onSuccess: () => {
      toast.success("Template duplicado.");
      onDuplicated();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro."),
  });
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicar template</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Novo nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Novo slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mut.mutate()} disabled={!nome || !slug || mut.isPending}>
            Duplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
