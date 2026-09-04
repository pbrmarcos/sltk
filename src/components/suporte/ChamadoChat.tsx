import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type ChatMensagem = {
  id: string;
  autor_tipo: "visitante" | "atendente" | "sistema";
  autor_nome: string;
  conteudo: string;
  created_at: string;
};

type Props = {
  mensagens: ChatMensagem[];
  /** "visitor" = página pública; "internal" = painel interno */
  viewpoint: "visitor" | "internal";
};

/** Chat compartilhado — cliente vê suas msgs à direita, painel interno vê o oposto. */
export function ChamadoChat({ mensagens, viewpoint }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens.length]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 max-h-[60vh] overflow-y-auto">
      {mensagens.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma mensagem ainda.</p>
      ) : (
        mensagens.map((m) => {
          const mine =
            (viewpoint === "visitor" && m.autor_tipo === "visitante") ||
            (viewpoint === "internal" && m.autor_tipo === "atendente");
          const isSystem = m.autor_tipo === "sistema";
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm",
                  isSystem
                    ? "bg-neutral-100 text-neutral-700 border italic"
                    : mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-white border",
                )}
              >
                <div className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">
                  {m.autor_nome} · {new Date(m.created_at).toLocaleString()}
                </div>
                <div className="whitespace-pre-wrap break-words">{m.conteudo}</div>
              </div>
            </div>
          );
        })
      )}
      <div ref={endRef} />
    </div>
  );
}
