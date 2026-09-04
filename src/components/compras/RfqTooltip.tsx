"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const RFQ_TOOLTIP_TEXT =
  "Checklist de cotação = pedido formal de proposta.\nÉ enviado a fornecedores para obter preço, prazo, condições de pagamento e Incoterm para um item.";

export function RfqTooltip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild className="cursor-help">
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" align="center" className="max-w-xs whitespace-pre-line leading-snug">
        {RFQ_TOOLTIP_TEXT}
      </TooltipContent>
    </Tooltip>
  );
}

export function RfqTooltipIcon({ className }: { className?: string }) {
  return (
    <RfqTooltip>
      <HelpCircle className={className} />
    </RfqTooltip>
  );
}
