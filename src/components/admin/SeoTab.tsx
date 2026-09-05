import { useState } from "react";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Search } from "lucide-react";
import {
  listPageSeo,
  scanPageSeo,
  upsertPageSeo,
  deletePageSeo,
} from "@/lib/page-seo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SeoFieldsCard } from "@/components/admin/SeoFieldsCard";

const qo = queryOptions({
  queryKey: ["admin", "page_seo"],
  queryFn: () => listPageSeo(),
});

type Row = {
  route_path: string;
  title: string | null;
  description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical: string | null;
  noindex: boolean;
  last_scanned_at: string | null;
};

export function SeoTab() {
  const qc = useQueryClient();
  const list = useQuery(qo);
  const scanFn = useServerFn(scanPageSeo);
  const upsertFn = useServerFn(upsertPageSeo);
  const deleteFn = useServerFn(deletePageSeo);

  const scan = useMutation({
    mutationFn: () => scanFn({ data: undefined as never }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin", "page_seo"] });
      toast.success(`Rastreio concluído — ${r.inserted} novas, ${r.refreshed} atualizadas.`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha no rastreio."),
  });

  const save = useMutation({
    mutationFn: (vars: Partial<Row> & { route_path: string }) => upsertFn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "page_seo"] });
      toast.success("SEO atualizado.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar."),
  });

  const del = useMutation({
    mutationFn: (route_path: string) => deleteFn({ data: { route_path } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "page_seo"] });
      toast.success("Registro removido.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao remover."),
  });

  if (list.isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const rows = (list.data ?? []) as Row[];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">SEO das páginas públicas</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Edite título, descrição, OpenGraph e indexação por rota.
          </p>
        </div>
        <Button
          onClick={() => scan.mutate()}
          disabled={scan.isPending}
          className="gap-2"
        >
          {scan.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Rastrear páginas públicas
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--bg-border)] p-8 text-center text-sm text-[var(--text-muted)]">
          Nenhuma página mapeada. Clique em <strong>Rastrear páginas públicas</strong> para gerar o SEO base.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <SeoCard
              key={row.route_path}
              row={row}
              onSave={(patch) => save.mutate({ ...patch, route_path: row.route_path })}
              onDelete={() => del.mutate(row.route_path)}
              saving={save.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SeoCard({
  row,
  onSave,
  onDelete,
  saving,
}: {
  row: Row;
  onSave: (patch: Partial<Row>) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [local, setLocal] = useState<Row>(row);
  const dirty = JSON.stringify(local) !== JSON.stringify(row);

  function field<K extends keyof Row>(k: K, v: Row[K]) {
    setLocal((p) => ({ ...p, [k]: v }));
  }

  return (
    <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <code className="rounded bg-muted px-2 py-1 font-mono text-xs">{row.route_path}</code>
          {row.last_scanned_at && (
            <span className="ml-2 text-xs text-[var(--text-muted)]">
              Rastreada em {new Date(row.last_scanned_at).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={local.noindex}
              onCheckedChange={(v) => field("noindex", v)}
              id={`noindex-${row.route_path}`}
            />
            <Label htmlFor={`noindex-${row.route_path}`} className="text-xs">
              noindex
            </Label>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="text-[var(--danger)]"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <SeoFieldsCard
        title={local.title ?? ""}
        onTitleChange={(v) => field("title", v)}
        description={local.description ?? ""}
        onDescriptionChange={(v) => field("description", v)}
        ogImage={local.og_image ?? ""}
        onOgImageChange={(v) => field("og_image", v)}
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Canonical URL</Label>
          <Input
            value={local.canonical ?? ""}
            onChange={(e) => field("canonical", e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label className="text-xs">og:title</Label>
          <Input
            value={local.og_title ?? ""}
            onChange={(e) => field("og_title", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">og:description</Label>
          <Textarea
            value={local.og_description ?? ""}
            onChange={(e) => field("og_description", e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!dirty}
          onClick={() => setLocal(row)}
        >
          Cancelar
        </Button>
        <Button
          size="sm"
          disabled={!dirty || saving}
          onClick={() =>
            onSave({
              title: local.title,
              description: local.description,
              og_title: local.og_title,
              og_description: local.og_description,
              og_image: local.og_image,
              canonical: local.canonical,
              noindex: local.noindex,
            })
          }
          className="gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}


