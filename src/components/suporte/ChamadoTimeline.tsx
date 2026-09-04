import { AlertTriangle, ArrowRightCircle, CheckCircle2, Clock, MessageSquare, Sparkles, User2 } from "lucide-react";

type Evento = {
  id: string;
  tipo: string;
  from_status: string | null;
  to_status: string | null;
  autor_nome: string | null;
  meta: any;
  at: string;
};

type Mensagem = {
  id: string;
  autor_tipo: "visitante" | "atendente" | "sistema";
  autor_nome: string;
  conteudo: string;
  created_at: string;
  interno?: boolean;
};

type Item = {
  id: string;
  ts: string;
  kind: "evento" | "mensagem";
  icon: React.ReactNode;
  title: string;
  detail?: string;
  tone: "neutral" | "info" | "warn" | "success";
};

function statusLabel(s: string | null | undefined) {
  if (!s) return "—";
  return s.replace(/_/g, " ");
}

function eventoToItem(e: Evento): Item | null {
  const base = { id: `e-${e.id}`, ts: e.at, kind: "evento" as const, tone: "neutral" as Item["tone"] };
  switch (e.tipo) {
    case "criado":
      return { ...base, icon: <Sparkles className="h-4 w-4" />, title: `Chamado aberto por ${e.autor_nome ?? "—"}` };
    case "status_change":
      return {
        ...base,
        icon: <ArrowRightCircle className="h-4 w-4" />,
        title: `Status: ${statusLabel(e.from_status)} → ${statusLabel(e.to_status)}`,
        detail: e.autor_nome ? `por ${e.autor_nome}` : undefined,
        tone: e.to_status === "resolvido" ? "success" : "info",
      };
    case "prioridade_change":
      return {
        ...base,
        icon: <AlertTriangle className="h-4 w-4" />,
        title: `Prioridade: ${e.meta?.de ?? "—"} → ${e.meta?.para ?? "—"}`,
        detail: [e.autor_nome ? `por ${e.autor_nome}` : null, e.meta?.motivo ? `Motivo: ${e.meta.motivo}` : null]
          .filter(Boolean).join(" · ") || undefined,
        tone: "warn",
      };
    case "atendente_change":
      return {
        ...base,
        icon: <User2 className="h-4 w-4" />,
        title: `Atendente: ${e.meta?.de_nome ?? "—"} → ${e.meta?.para_nome ?? "não atribuído"}`,
        detail: [e.autor_nome ? `por ${e.autor_nome}` : null, e.meta?.motivo ? `Motivo: ${e.meta.motivo}` : null]
          .filter(Boolean).join(" · ") || undefined,
        tone: "info",
      };
    case "assumido":
      return { ...base, icon: <User2 className="h-4 w-4" />, title: `${e.autor_nome ?? "Atendente"} assumiu o chamado`, tone: "info" };
    case "resolvido":
      return { ...base, icon: <CheckCircle2 className="h-4 w-4" />, title: `Chamado resolvido`, detail: e.autor_nome ?? undefined, tone: "success" };
    case "reaberto":
      return { ...base, icon: <ArrowRightCircle className="h-4 w-4" />, title: `Chamado reaberto`, detail: e.autor_nome ?? undefined, tone: "warn" };
    case "arquivado":
      return { ...base, icon: <ArrowRightCircle className="h-4 w-4" />, title: `Chamado arquivado`, detail: e.autor_nome ?? undefined };
    case "sla_estourado":
      return { ...base, icon: <AlertTriangle className="h-4 w-4" />, title: `SLA de resposta estourado`, tone: "warn" };
    case "estagnado":
      return { ...base, icon: <Clock className="h-4 w-4" />, title: `Chamado sinalizado como estagnado`, detail: "Aguardando resposta interna há mais de 48h", tone: "warn" };
    case "comentario_interno":
      return null; // mensagem interna aparece via mensagens
    case "vinculado_equipamento":
      return { ...base, icon: <ArrowRightCircle className="h-4 w-4" />, title: `Equipamento vinculado`, detail: e.autor_nome ?? undefined };
    case "mensagem":
      return null; // já vem via mensagens
    default:
      return { ...base, icon: <Sparkles className="h-4 w-4" />, title: e.tipo };
  }
}

function mensagemToItem(m: Mensagem): Item {
  const isInterno = m.interno === true;
  return {
    id: `m-${m.id}`,
    ts: m.created_at,
    kind: "mensagem",
    icon: <MessageSquare className="h-4 w-4" />,
    title: isInterno
      ? `Comentário interno · ${m.autor_nome}`
      : m.autor_tipo === "visitante"
        ? `Mensagem do cliente · ${m.autor_nome}`
        : `Resposta enviada · ${m.autor_nome}`,
    detail: m.conteudo,
    tone: isInterno ? "warn" : m.autor_tipo === "visitante" ? "info" : "neutral",
  };
}

const toneClasses: Record<Item["tone"], string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-sky-100 text-sky-700",
  warn: "bg-amber-100 text-amber-800",
  success: "bg-emerald-100 text-emerald-700",
};

export function ChamadoTimeline({
  eventos,
  mensagens,
}: {
  eventos: Evento[];
  mensagens: Mensagem[];
}) {
  const items: Item[] = [
    ...eventos.map(eventoToItem).filter((x): x is Item => !!x),
    ...mensagens.map(mensagemToItem),
  ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground italic">Sem atividade registrada.</div>;
  }

  return (
    <ol className="relative border-l pl-4 space-y-3">
      {items.map((it) => (
        <li key={it.id} className="relative">
          <span
            className={`absolute -left-[22px] top-0 flex h-6 w-6 items-center justify-center rounded-full ${toneClasses[it.tone]}`}
          >
            {it.icon}
          </span>
          <div className="text-sm">
            <div className="font-medium">{it.title}</div>
            {it.detail ? (
              <div className="text-muted-foreground whitespace-pre-wrap break-words">{it.detail}</div>
            ) : null}
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground/70 mt-0.5">
              {new Date(it.ts).toLocaleString()}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
