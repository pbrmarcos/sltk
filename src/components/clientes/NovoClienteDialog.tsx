import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClienteRapidoForm } from "@/components/clientes/ClienteRapidoForm";
import type { ClienteInput } from "@/lib/clientes.shared";

export type NovoClienteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado após salvar. O diálogo não navega nem recarrega a tela de origem. */
  onCreated: (cliente: { id: string; codigo: string }, values: ClienteInput) => void;
  initialValues?: Partial<ClienteInput>;
};

/** Cadastro rápido de cliente em modal (usado dentro do orçamento). */
export function NovoClienteDialog({
  open,
  onOpenChange,
  onCreated,
  initialValues,
}: NovoClienteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>Só o essencial — o resto se completa na ficha.</DialogDescription>
        </DialogHeader>
        {open && (
          <ClienteRapidoForm
            initialValues={initialValues}
            onCancel={() => onOpenChange(false)}
            onCreated={(cliente, values) => {
              onCreated(cliente, values);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
