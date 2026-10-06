import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Archive,
  ArrowLeft,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClienteStatusBadge } from "@/components/clientes/ClienteStatusBadge";
import { NewOportunidadeDialog } from "@/components/comercial/pipeline/NewOportunidadeDialog";
import { deleteCliente } from "@/lib/clientes.functions";
import { useAuth } from "@/hooks/use-auth";
import type { ClienteRow } from "./ficha-utils";

/** Barra fixa da ficha: voltar · nome · status · Minerar dados · Nova oportunidade · ⋯ */
export function ClienteTopbar({
  cliente,
  minerando,
  onMinerar,
}: {
  cliente: ClienteRow;
  minerando: boolean;
  onMinerar: () => void;
}) {
  const auth = useAuth();
  const canArquivar = auth.role === "admin" || auth.role === "manager";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [novaOppOpen, setNovaOppOpen] = useState(false);
  const [arquivarOpen, setArquivarOpen] = useState(false);

  const arquivarMut = useMutation({
    mutationFn: () => deleteCliente({ data: { id: cliente.id } }),
    onSuccess: () => {
      toast.success("Cliente arquivado.");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      navigate({ to: "/clientes" });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao arquivar."),
    onSettled: () => setArquivarOpen(false),
  });

  return (
    <div className="sticky top-0 z-20 flex min-h-12 flex-wrap items-center gap-2 border-b border-border bg-card/85 px-4 py-1.5 backdrop-blur md:px-6">
      <Link
        to="/clientes"
        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[12.5px] text-muted-foreground hover:bg-muted"
        aria-label="Voltar para clientes"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Clientes</span>
      </Link>
      <span className="truncate text-[12.5px] font-medium text-foreground">
        {cliente.razao_social}
      </span>
      <ClienteStatusBadge status={cliente.status ?? cliente.lifecycle_stage} />
      {cliente.key_account && (
        <Badge
          variant="outline"
          className="hidden items-center gap-1 border-amber-300 bg-amber-50 text-amber-700 sm:inline-flex"
        >
          <Star className="h-3 w-3 fill-amber-500 stroke-amber-500" /> Key Account
        </Badge>
      )}
      <div className="ml-auto flex items-center gap-2">
        <Button
          size="sm"
          disabled={minerando}
          onClick={onMinerar}
          title="Pesquisa a empresa na Receita, no site e no Google e completa os campos vazios"
        >
          {minerando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Minerar dados</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => setNovaOppOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Nova oportunidade</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="px-2" aria-label="Mais ações">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/clientes/$codigo/editar" params={{ codigo: cliente.codigo }}>
                <Pencil className="mr-2 h-4 w-4" /> Editar cadastro completo
              </Link>
            </DropdownMenuItem>
            {canArquivar && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-rose-700 focus:text-rose-800"
                  onSelect={() => setArquivarOpen(true)}
                >
                  <Archive className="mr-2 h-4 w-4" /> Arquivar cliente
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <NewOportunidadeDialog
        open={novaOppOpen}
        onOpenChange={setNovaOppOpen}
        clienteId={cliente.id}
        empresaNome={cliente.nome_fantasia || cliente.razao_social}
      />

      <AlertDialog
        open={arquivarOpen}
        onOpenChange={(o) => !arquivarMut.isPending && setArquivarOpen(o)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar {cliente.razao_social}?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente sai das listas do sistema. Oportunidades e processos vinculados continuam
              intactos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={arquivarMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={arquivarMut.isPending}
              onClick={() => arquivarMut.mutate()}
            >
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
