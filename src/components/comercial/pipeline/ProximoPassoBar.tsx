import { ArrowRight, Calendar, ClipboardList, FileText, Trophy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import type { OportunidadeLite, PipelineStage } from "@/lib/oportunidades.functions";
import { STAGE_LABEL } from "@/lib/oportunidades.functions";

export type ProximoPassoActions = {
  onAgenda: () => void;
  onGerarOrcamento: () => void;
  onAvancar: (stage: PipelineStage) => void;
  onPromover: () => void;
};

const ORDEM: PipelineStage[] = ["novo", "qualificado", "proposta", "negociacao", "ganho"];

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

  const idx = ORDEM.indexOf(opp.pipeline_stage);
  const proximo = idx >= 0 && idx < ORDEM.length - 1 ? ORDEM[idx + 1] : null;

  let titulo = "";
  let descricao = "";
  let acoes: React.ReactNode = null;

  if (opp.pipeline_stage === "novo") {
    titulo = "Passo 1 · Qualificar o suspect";
    descricao = "Agende a entrevista técnica e confirme a necessidade real antes de avançar.";
    acoes = (
      <>
        <Button size="sm" onClick={actions.onAgenda}>
          <Calendar className="h-3.5 w-3.5 mr-1" /> Agendar entrevista
        </Button>
        {proximo && (
          <Button size="sm" variant="outline" onClick={() => actions.onAvancar(proximo)}>
            Marcar como {STAGE_LABEL[proximo].toLowerCase()} <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
      </>
    );
  } else if (opp.pipeline_stage === "qualificado") {
    titulo = "Passo 2 · Levantar requisitos";
    descricao = "Envie o checklist técnico público ao cliente. Com as respostas, gere o orçamento.";
    acoes = (
      <>
        <Button size="sm" variant="outline" asChild>
          <Link to="/comercial/checklists">
            <ClipboardList className="h-3.5 w-3.5 mr-1" /> Enviar checklist
          </Link>
        </Button>
        <Button size="sm" onClick={actions.onGerarOrcamento}>
          <FileText className="h-3.5 w-3.5 mr-1" /> Gerar orçamento
        </Button>
      </>
    );
  } else if (opp.pipeline_stage === "proposta") {
    titulo = orcamentos > 0 ? "Passo 3 · Negociar a proposta" : "Passo 3 · Gerar a proposta";
    descricao =
      orcamentos > 0
        ? `${orcamentos} orçamento(s) vinculado(s). Registre o retorno do cliente nas anotações e avance para negociação.`
        : "Nenhum orçamento vinculado ainda. Gere o orçamento a partir desta oportunidade.";
    acoes = (
      <>
        <Button size="sm" onClick={actions.onGerarOrcamento}>
          <FileText className="h-3.5 w-3.5 mr-1" /> {orcamentos > 0 ? "Nova versão / orçamento" : "Gerar orçamento"}
        </Button>
        {proximo && (
          <Button size="sm" variant="outline" onClick={() => actions.onAvancar(proximo)}>
            Ir para negociação <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
      </>
    );
  } else if (opp.pipeline_stage === "negociacao") {
    titulo = "Passo 4 · Fechar";
    descricao =
      orcamentos > 0
        ? "Ajuste condições finais e marque como ganho para converter em cliente ativo."
        : "Gere o orçamento antes de fechar — o valor real vem do documento.";
    acoes = (
      <>
        {orcamentos === 0 && (
          <Button size="sm" onClick={actions.onGerarOrcamento}>
            <FileText className="h-3.5 w-3.5 mr-1" /> Gerar orçamento
          </Button>
        )}
        <Button size="sm" variant={orcamentos > 0 ? "default" : "outline"} onClick={() => actions.onAvancar("ganho")}>
          <Trophy className="h-3.5 w-3.5 mr-1" /> Marcar como ganho
        </Button>
      </>
    );
  } else {
    titulo = "Passo 5 · Converter em cliente ativo";
    descricao = "Complete a ficha do cliente e abra o processo de engenharia/produção.";
    acoes = (
      <Button size="sm" onClick={actions.onPromover}>
        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Abrir ficha do cliente
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-primary">{titulo}</div>
          <p className="text-[11.5px] text-muted-foreground">{descricao}</p>
        </div>
        {!locked && <div className="flex flex-wrap gap-2">{acoes}</div>}
      </div>
      {locked && (
        <p className="text-[11px] text-amber-700">Oportunidade convertida em processo — ações desabilitadas.</p>
      )}
    </div>
  );
}
