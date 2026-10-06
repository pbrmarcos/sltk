import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LOST_REASON_MIN } from "@/lib/oportunidades.functions";

/** Campo de motivo da perda — mesma regra em todo lugar (mín. {LOST_REASON_MIN}). */
export function LostReasonField({
  value,
  onChange,
  rows = 3,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
}) {
  const faltam = Math.max(0, LOST_REASON_MIN - value.trim().length);
  return (
    <div className="space-y-1">
      <Textarea
        placeholder="Ex.: preço, prazo, concorrente X, sem fit técnico…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={500}
        className={className}
        autoFocus={autoFocus}
      />
      {faltam > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Mais {faltam} caractere{faltam > 1 ? "s" : ""} para registrar o motivo.
        </p>
      )}
    </div>
  );
}

export function lostReasonValida(v: string | null | undefined) {
  return (v ?? "").trim().length >= LOST_REASON_MIN;
}

/** Diálogo único de "Marcar como perdida" (kanban, oportunidade aberta). */
export function MarcarPerdidaDialog({
  open,
  onOpenChange,
  titulo,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Nome da oportunidade, para o usuário saber o que está perdendo. */
  titulo?: string | null;
  pending?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Marcar como perdida</DialogTitle>
          <DialogDescription>
            {titulo ? <span className="font-medium text-foreground">{titulo}</span> : null}
            {titulo ? " — " : ""}o motivo alimenta a análise do funil.
          </DialogDescription>
        </DialogHeader>
        <LostReasonField value={reason} onChange={setReason} autoFocus />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!lostReasonValida(reason) || pending}
            onClick={() => onConfirm(reason.trim())}
          >
            Confirmar perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
