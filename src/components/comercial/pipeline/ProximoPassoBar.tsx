import {
  ArrowRight,
  Calendar,
  ClipboardList,
  FileText,
  Trophy,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { OportunidadeLite, PipelineStage } from "@/lib/oportunidades.functions";

export type ProximoPassoActions = {
  onAgenda: () => void;
  onGerarOrcamento: () => void;
  onAvancar: (stage: PipelineStage) => void;
  onPromover: () => void;
};

type Passo = {
  titulo: string;
  descricao: string;
  acao: React.ReactNode;
};

/**
 * Uma linha: "Próximo passo · Qualificar o suspect  (i)  [Agendar entrevista]".
 * A explicação longa fica no tooltip do ícone; só uma ação por etapa.
 */
export function ProximoPassoBar({
  opp,
  orcamentos,
  locked,
  actions,
}: {
  opp: OportunidadeLite;
  orcamentos: number;
  locked: boolean;
  actions: ProximoPassoActions;
}) {
  if (opp.pipeline_stage === "perdido") return null;

  const btn = (label: string, Icon: typeof Calendar, onClick: () => void) => (
    <Button size="sm" className="h-7 text-xs" onClick={onClick}>
      <Icon className="mr-1 h-3.5 w-3.5" /> {label}
    </Button>
  );

  let passo: Passo;
  switch (opp.pipeline_stage) {
    case "novo":
      passo = {
        titulo: "Qualificar o suspect",
        descricao: "Agende a entrevista técnica e confirme a necessidade real antes de avançar.",
        acao: btn("Agendar entrevista", Calendar, actions.onAgenda),
      };
      break;
    case "qualificado":
      passo = {
        titulo: "Levantar requisitos",
        descricao: "Envie o checklist técnico ao cliente; com as respostas, gere o orçamento.",
        acao: opp.cliente_codigo ? (
          <Button size="sm" className="h-7 text-xs" asChild>
            <Link
              to="/clientes/$codigo"
              params={{ codigo: opp.cliente_codigo }}
              search={{ sec: "checklist" } as never}
            >
              <ClipboardList className="mr-1 h-3.5 w-3.5" /> Enviar checklist
            </Link>
          </Button>
        ) : (
          btn("Gerar orçamento", FileText, actions.onGerarOrcamento)
        ),
      };
      break;
    case "proposta":
      passo = {
        titulo: orcamentos > 0 ? "Negociar a proposta" : "Gerar a proposta",
        descricao:
          orcamentos > 0
            ? `${orcamentos} orçamento(s) vinculado(s). Registre o retorno do cliente nas anotações e avance para negociação.`
            : "Nenhum orçamento vinculado ainda. Gere o orçamento a partir desta oportunidade.",
        acao:
          orcamentos > 0
            ? btn("Ir para negociação", ArrowRight, () => actions.onAvancar("negociacao"))
            : btn("Gerar orçamento", FileText, actions.onGerarOrcamento),
      };
      break;
    case "negociacao":
      passo = {
        titulo: "Fechar",
        descricao:
          orcamentos > 0
            ? "Ajuste as condições finais e marque como ganho para converter em cliente ativo."
            : "Gere o orçamento antes de fechar — o valor real vem do documento.",
        acao:
          orcamentos > 0
            ? btn("Marcar como ganho", Trophy, () => actions.onAvancar("ganho"))
            : btn("Gerar orçamento", FileText, actions.onGerarOrcamento),
      };
      break;
    default:
      passo = {
        titulo: "Converter em cliente ativo",
        descricao: "Complete a ficha do cliente e abra o processo de engenharia/produção.",
        acao: btn("Abrir ficha do cliente", CheckCircle2, actions.onPromover),
      };
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-1.5 text-[12.5px]">
      <span className="text-muted-foreground">Próximo passo</span>
      <span className="font-medium text-primary">{passo.titulo}</span>
      <Info className="h-3.5 w-3.5 text-muted-foreground" aria-label={passo.descricao} />
      <span className="sr-only">{passo.descricao}</span>
      <span className="ml-auto">
        {locked ? (
          <span className="text-[11px] text-amber-700">Convertida em processo</span>
        ) : (
          passo.acao
        )}
      </span>
    </div>
  );
}
