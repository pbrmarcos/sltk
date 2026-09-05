import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, HelpCircle, Compass, ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FLUXO_COMERCIAL, STAGE_GUIA } from "@/lib/comercial/guia";
import type { PipelineStage } from "@/lib/oportunidades.functions";

const STORAGE_KEY = "comercial-guia-aberto";

export function ProcessoComercialGuia({
  className,
  destaque,
}: {
  className?: string;
  destaque?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(STORAGE_KEY) !== "0");
    } catch {
      setOpen(true);
    }
  }, []);

  function toggle() {
    setOpen((v) => {
      try {
        localStorage.setItem(STORAGE_KEY, v ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !v;
    });
  }

  return (
    <div className={cn("rounded-lg border bg-muted/30", className)}>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <Compass className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-medium">Como funciona o processo comercial</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          — clique em cada etapa para ver o que fazer antes de avançar
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 flex flex-wrap items-center gap-1">
          {FLUXO_COMERCIAL.map((etapa, i) => (
            <div key={etapa.id} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 bg-white text-xs",
                      destaque === etapa.id &&
                        "border-primary text-primary font-medium bg-primary/5",
                    )}
                  >
                    {etapa.titulo}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 text-sm">
                  <div className="font-medium">{etapa.titulo}</div>
                  <p className="text-xs text-muted-foreground mt-1">{etapa.resumo}</p>
                  <div className="text-xs font-medium mt-3">Antes de avançar:</div>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground list-disc pl-4">
                    {etapa.antes.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                  {etapa.doc && (
                    <Link
                      to="/ajuda/documentacao/$categoria/$slug"
                      params={{ categoria: etapa.doc.categoria, slug: etapa.doc.slug }}
                      className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <BookOpen className="w-3 h-3" /> Ver documentação
                    </Link>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StageHintButton({ stage }: { stage: PipelineStage }) {
  const guia = STAGE_GUIA[stage];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`O que fazer nesta etapa (${stage})`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-sm">
        <div className="text-xs font-medium">Para sair desta coluna, garanta que:</div>
        <ul className="mt-1 space-y-1 text-xs text-muted-foreground list-disc pl-4">
          {guia.antes.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <div className="mt-3 text-xs">
          <span className="font-medium">Próximo passo: </span>
          <span className="text-muted-foreground">{guia.proximo}</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
