import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Em que ponto está a leitura da foto (o que o usuário vê enquanto espera). */
export type EtapaLeitura =
  | { fase: "preparando"; atual: number; total: number }
  | { fase: "lendo"; inicio: number }
  | { fase: "preenchendo" };

/**
 * A leitura pela IA é uma chamada só ao servidor: não há progresso real a
 * relatar. O texto acompanha o tempo decorrido e descreve o que de fato
 * acontece lá (envio, leitura, identificação, novas tentativas quando o
 * Google está sobrecarregado — ver ai-gateway.server.ts).
 */
function mensagemLeitura(seg: number) {
  if (seg < 3) return "Enviando a foto para a IA…";
  if (seg < 10) return "Lendo os textos da embalagem ou do cartão…";
  if (seg < 20) return "Identificando empresa, contato e ramo…";
  if (seg < 35) return "A IA está mais lenta que o normal. Aguardando a resposta…";
  return "Serviço de IA sobrecarregado. Tentando de novo automaticamente…";
}

const PASSOS = ["Preparar foto", "Leitura pela IA", "Preencher campos"] as const;

export function LeituraFotoStatus({ etapa }: { etapa: EtapaLeitura }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (etapa.fase !== "lendo") return;
    const t = setInterval(() => setAgora(Date.now()), 500);
    return () => clearInterval(t);
  }, [etapa.fase]);

  const passo = etapa.fase === "preparando" ? 0 : etapa.fase === "lendo" ? 1 : 2;
  const seg = etapa.fase === "lendo" ? Math.max(0, Math.floor((agora - etapa.inicio) / 1000)) : 0;
  const texto =
    etapa.fase === "preparando"
      ? etapa.total > 1
        ? `Reduzindo a foto ${etapa.atual} de ${etapa.total} para envio…`
        : "Reduzindo a foto para envio…"
      : etapa.fase === "lendo"
        ? mensagemLeitura(seg)
        : "Preenchendo os campos…";

  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2.5" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-[13px]">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        <span className="min-w-0 flex-1">{texto}</span>
        {etapa.fase === "lendo" && seg > 0 && (
          <span className="shrink-0 tabular-nums text-[12px] text-muted-foreground">{seg} s</span>
        )}
      </div>
      <ol className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
        {PASSOS.map((p, i) => (
          <li
            key={p}
            className={cn(
              "flex items-center gap-1",
              i === passo && "font-medium text-foreground",
              i > passo && "opacity-60",
            )}
          >
            {i < passo ? (
              <Check className="h-3 w-3 text-emerald-600" />
            ) : (
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  i === passo ? "bg-primary" : "bg-muted-foreground/40",
                )}
              />
            )}
            {p}
          </li>
        ))}
      </ol>
    </div>
  );
}
