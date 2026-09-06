"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const COTACAO_TOOLTIP_TEXT =
  "Cotação de compra = pedido formal de proposta.\nÉ enviado a fornecedores para obter preço, prazo, condições de pagamento e Incoterm para um item.";

export function CotacaoTooltip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild className="cursor-help">
        {children}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className="max-w-xs whitespace-pre-line leading-snug"
      >
        {COTACAO_TOOLTIP_TEXT}
      </TooltipContent>
    </Tooltip>
  );
}

export function CotacaoTooltipIcon({ className }: { className?: string }) {
  return (
    <CotacaoTooltip>
      <HelpCircle className={className} />
    </CotacaoTooltip>
  );
}
