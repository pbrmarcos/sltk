import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Loader2, Trash2 } from "lucide-react";
import { adminSetSecret, adminDeleteSecret } from "@/lib/system-secrets.functions";
import type { CapabilityStatus } from "@/lib/system-diagnostics.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

// Campos que costumam ter valor multi-linha (chave PEM) — usam textarea.
const CAMPOS_MULTILINHA = new Set(["GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"]);

export function ConfigurarCapacidadeDialog({
  cap,
  onSalvo,
}: {
  cap: CapabilityStatus;
  onSalvo: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const setFn = useServerFn(adminSetSecret);
  const delFn = useServerFn(adminDeleteSecret);

  const salvar = useMutation({
    mutationFn: async () => {
      const entradas = Object.entries(valores).filter(([, v]) => v.trim().length > 0);
      if (entradas.length === 0) throw new Error("Preencha ao menos um campo pra salvar.");
      for (const [name, value] of entradas) {
        await setFn({ data: { name, value: value.trim() } });
      }
    },
    onSuccess: () => {
      toast.success("Credencial salva.");
      setValores({});
      setOpen(false);
      onSalvo();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar."),
  });

  const remover = useMutation({
    mutationFn: (name: string) => delFn({ data: { name } }),
    onSuccess: (_r, name) => {
      toast.success(`${name} removida.`);
      setValores((v) => ({ ...v, [name]: "" }));
      onSalvo();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível remover."),
  });

  const camposUnicos = cap.envs;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && (salvar.isPending || remover.isPending)) return;
        setOpen(v);
        if (!v) setValores({});
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="mr-1.5 h-3.5 w-3.5" />
          Configurar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cap.label}</DialogTitle>
          <DialogDescription>
            Os valores são criptografados no banco (Supabase Vault) e nunca são exibidos de volta —
            apenas mascarados. Deixe em branco o que não quiser alterar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {camposUnicos.map((e) => (
            <div key={e.nome} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`campo-${e.nome}`} className="font-mono text-[12px]">
                  {e.nome}
                  {e.opcional ? (
                    <span className="ml-1.5 font-sans text-[11px] font-normal text-[var(--text-muted)]">
                      (opcional)
                    </span>
                  ) : null}
                </Label>
                {e.presente && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-[var(--danger)] hover:text-[var(--danger)]"
                    disabled={remover.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remover a credencial ${e.nome}? Isso desativa a integração até uma nova credencial ser configurada.`,
                        )
                      ) {
                        remover.mutate(e.nome);
                      }
                    }}
                  >
                    {remover.isPending && remover.variables === e.nome ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
              {CAMPOS_MULTILINHA.has(e.nome) ? (
                <Textarea
                  id={`campo-${e.nome}`}
                  rows={4}
                  className="font-mono text-[12px]"
                  placeholder={e.presente ? (e.mascara ?? "Definida") : "Não definida"}
                  value={valores[e.nome] ?? ""}
                  onChange={(ev) => setValores((v) => ({ ...v, [e.nome]: ev.target.value }))}
                />
              ) : (
                <Input
                  id={`campo-${e.nome}`}
                  type="password"
                  autoComplete="off"
                  placeholder={e.presente ? (e.mascara ?? "Definida") : "Não definida"}
                  value={valores[e.nome] ?? ""}
                  onChange={(ev) => setValores((v) => ({ ...v, [e.nome]: ev.target.value }))}
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={salvar.isPending || remover.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
            {salvar.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
