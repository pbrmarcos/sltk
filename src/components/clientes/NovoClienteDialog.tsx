import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import type { ClienteInput } from "@/lib/clientes.shared";

export type NovoClienteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado após salvar. O diálogo não navega nem recarrega a tela de origem. */
  onCreated: (cliente: { id: string; codigo: string }, values: ClienteInput) => void;
  initialValues?: Partial<ClienteInput>;
};

/**
 * Cadastro rápido de cliente em modal — reaproveita o mesmo `ClienteForm`
 * da tela cheia, apenas com os campos mínimos obrigatórios.
 */
export function NovoClienteDialog({ open, onOpenChange, onCreated, initialValues }: NovoClienteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>
            Preencha apenas o essencial — você pode completar o cadastro depois em Clientes.
          </DialogDescription>
        </DialogHeader>
        <ClienteForm
          variant="modal"
          initialValues={initialValues}
          onCancel={() => onOpenChange(false)}
          onCreated={(cliente, values) => {
            onCreated(cliente, values);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
