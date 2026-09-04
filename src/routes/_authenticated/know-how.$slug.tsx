import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Pencil, Send, Film, FileType2, Printer, Star } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getItemBySlug, enviarParaRevisao, getMediaSignedUrl, listFavoritos, toggleFavorito } from "@/lib/know-how.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/know-how/$slug")({
  component: KnowHowDetail,
});

function KnowHowDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();

  const getFn = useServerFn(getItemBySlug);
  const item = useQuery({
    queryKey: ["kh", "item", slug],
    queryFn: () => getFn({ data: { slug } }),
  });

  const enviarFn = useServerFn(enviarParaRevisao);
  const enviar = useMutation({
    mutationFn: (id: string) => enviarFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Enviado para revisão.");
      item.refetch();
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const qc = useQueryClient();
  const favoritos = useQuery({ queryKey: ["kh", "favoritos"], queryFn: () => listFavoritos() });
  const toggleFn = useServerFn(toggleFavorito);
  const isFav = !!item.data && (favoritos.data ?? []).includes(item.data.id);
  const favorito = useMutation({
    mutationFn: (itemId: string) => toggleFn({ data: { itemId } }),
    onSuccess: (res) => {
      toast.success(res.favorito ? "Adicionado aos favoritos." : "Removido dos favoritos.");
      qc.invalidateQueries({ queryKey: ["kh", "favoritos"] });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });



  if (item.isLoading) {
    return (
      <PageContainer>
        <p className="text-sm text-[var(--text-muted)]">Carregando…</p>
      </PageContainer>
    );
  }
  if (item.error || !item.data) {
    return (
      <PageContainer>
        <p className="text-sm text-[var(--danger)]">
          {(item.error as Error | undefined)?.message ?? "Item não encontrado."}
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/know-how">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </PageContainer>
    );
  }

  const it = item.data;
  const isOwner = !!user && it.created_by === user.id;
  const canEdit = isOwner || role === "admin" || role === "manager";

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Know-how", href: "/know-how" },
          { label: it.titulo },
        ]}
        title={it.titulo}
        subtitle={it.resumo ?? undefined}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => favorito.mutate(it.id)}
              disabled={favorito.isPending}
              aria-pressed={isFav}
            >
              <Star className={`mr-1.5 h-4 w-4 ${isFav ? "fill-amber-400 text-amber-500" : ""}`} />
              {isFav ? "Favorito" : "Favoritar"}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/know-how/imprimir/$slug" params={{ slug: it.slug }}>
                <Printer className="mr-1.5 h-4 w-4" />
                Exportar PDF
              </Link>
            </Button>

            {canEdit && it.status === "rascunho" && (
              <Button
                size="sm"
                onClick={() => enviar.mutate(it.id)}
                disabled={enviar.isPending}
              >
                <Send className="mr-1.5 h-4 w-4" />
                Enviar para revisão
              </Button>
            )}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => navigate({ to: "/know-how/novo", search: { edit: it.slug } as never })}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="uppercase">{it.tipo}</Badge>
        <Badge variant="outline" className={statusClass(it.status)}>{it.status}</Badge>
        <span className="text-[var(--text-muted)]">v{it.versao}</span>
        <span className="text-[var(--text-muted)]">
          · atualizado em {new Date(it.atualizado_em).toLocaleDateString("pt-BR")}
        </span>
      </div>

      {it.tags?.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1">
          {it.tags.map((t) => (
            <span key={t} className="rounded bg-[var(--bg-elevated)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
              #{t}
            </span>
          ))}
        </div>
      )}

      {it.midia_url && (
        <MediaPlayer tipo={it.tipo} midia={it.midia_url} />
      )}

      {it.corpo && (
        <article className="prose prose-sm max-w-none whitespace-pre-wrap rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 text-sm leading-relaxed text-[var(--text-primary)]">
          {it.corpo}
        </article>
      )}
    </PageContainer>
  );
}

function isExternalUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function vimeoEmbed(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

function MediaPlayer({ tipo, midia }: { tipo: string; midia: string }) {
  const external = isExternalUrl(midia);
  const getSigned = useServerFn(getMediaSignedUrl);
  const signed = useQuery({
    queryKey: ["kh", "media-signed", midia],
    queryFn: () => getSigned({ data: { path: midia } }),
    enabled: !external,
    staleTime: 1000 * 60 * 30,
  });

  if (external) {
    const yt = tipo === "video" ? youtubeEmbed(midia) : null;
    const vm = tipo === "video" ? vimeoEmbed(midia) : null;
    if (yt || vm) {
      return (
        <div className="mb-6 aspect-video overflow-hidden rounded-lg border border-[var(--bg-border)] bg-black">
          <iframe
            src={yt ?? vm ?? ""}
            title="Vídeo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      );
    }
    return (
      <div className="mb-6 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
        <a
          href={midia}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm text-[var(--info)] hover:underline"
        >
          {tipo === "pdf" ? <FileType2 className="h-4 w-4" /> : <Film className="h-4 w-4" />}
          {tipo === "pdf" ? "Abrir PDF" : "Abrir mídia"}
        </a>
      </div>
    );
  }

  if (signed.isLoading) {
    return (
      <div className="mb-6 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-muted)]">
        Carregando mídia…
      </div>
    );
  }
  if (signed.error || !signed.data) {
    return (
      <div className="mb-6 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--danger)]">
        Falha ao carregar mídia: {(signed.error as Error | undefined)?.message ?? "desconhecido"}
      </div>
    );
  }

  const url = signed.data.url;
  if (tipo === "video") {
    return (
      <div className="mb-6 overflow-hidden rounded-lg border border-[var(--bg-border)] bg-black">
        <video src={url} controls playsInline className="h-auto max-h-[70vh] w-full" />
      </div>
    );
  }
  if (tipo === "pdf") {
    return (
      <div className="mb-6 h-[70vh] overflow-hidden rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]">
        <iframe src={url} title="PDF" className="h-full w-full" />
      </div>
    );
  }
  return (
    <div className="mb-6 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
      <a href={url} target="_blank" rel="noreferrer" className="text-sm text-[var(--info)] hover:underline">
        Baixar arquivo
      </a>
    </div>
  );
}

function statusClass(s: string): string {
  switch (s) {
    case "publicado":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "em_revisao":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "arquivado":
      return "bg-rose-50 text-rose-800 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}
