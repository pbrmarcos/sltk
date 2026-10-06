import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES, STAGE_LABEL } from "@/lib/oportunidades.functions";
import { STAGE_GUIA } from "@/lib/comercial/guia";

/** Um único "?" no cabeçalho do pipeline com o que cada etapa espera. */
export function StageHelpPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          aria-label="Como funcionam as etapas"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 text-sm">
        <div className="mb-2 text-xs font-medium">O que garantir em cada etapa</div>
        <ul className="space-y-2">
          {PIPELINE_STAGES.filter((s) => s !== "perdido").map((s) => (
            <li key={s} className="text-xs">
              <span className="font-medium">{STAGE_LABEL[s]}</span>
              <span className="text-muted-foreground"> — {STAGE_GUIA[s].antes.join("; ")}.</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Arraste o card para mudar de etapa. Em Ganho o sistema converte em cliente; em Perdidas
          pede o motivo.
        </p>
      </PopoverContent>
    </Popover>
  );
}
