import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

import {
  listMinhasNotificacoes,
  marcarComoLida,
  marcarTodasLidas,
} from "@/lib/notificacoes.functions";

export function NotificationsBell({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const qc = useQueryClient();
  const { session } = useAuth();

  const { data } = useQuery({
    queryKey: ["notif", "mine", { onlyUnread }],
    queryFn: () => listMinhasNotificacoes({ data: { limit: 20, apenas_nao_lidas: onlyUnread } }),
    enabled: !!session?.access_token,
    staleTime: 30_000,
    refetchInterval: session?.access_token ? 60_000 : false,
  });

  const naoLidas = data?.nao_lidas ?? 0;
  const rows = (data?.rows ?? []) as any[];

  const readOne = useMutation({
    mutationFn: (id: string) => marcarComoLida({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notif", "mine"] }),
  });
  const readAll = useMutation({
    mutationFn: () => marcarTodasLidas(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notif", "mine"] }),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent",
            collapsed && "justify-center px-1.5",
          )}
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell className="h-4 w-4" />
          {naoLidas > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {naoLidas > 99 ? "99+" : naoLidas}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">Notificações</div>
            {naoLidas > 0 && (
              <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                {naoLidas} não lidas
              </span>
            )}
          </div>
          {naoLidas > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 gap-1 px-2 text-[11px]"
              onClick={() => readAll.mutate()}
              disabled={readAll.isPending}
            >
              <CheckCheck className="h-3 w-3" /> marcar todas
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-3 py-1.5">
          <button
            type="button"
            onClick={() => setOnlyUnread(false)}
            className={cn(
              "rounded px-2 py-0.5 text-[11px]",
              !onlyUnread
                ? "bg-background font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setOnlyUnread(true)}
            className={cn(
              "rounded px-2 py-0.5 text-[11px]",
              onlyUnread
                ? "bg-background font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Não lidas
          </button>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {rows.length === 0 ? (
            <div className="p-6 text-center text-[12px] text-muted-foreground">
              {onlyUnread ? "Nenhuma notificação pendente." : "Sem notificações."}
            </div>
          ) : (
            rows.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-2 border-b border-border/30 px-3 py-2 last:border-b-0",
                  !n.lida_em && "bg-primary/5",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium">{n.titulo}</div>
                  {n.mensagem && (
                    <div className="line-clamp-2 text-[11px] text-muted-foreground">
                      {n.mensagem}
                    </div>
                  )}
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{new Date(n.created_at).toLocaleString("pt-BR")}</span>
                    {n.link && (
                      <Link
                        to={n.link}
                        onClick={() => {
                          if (!n.lida_em) readOne.mutate(n.id);
                          setOpen(false);
                        }}
                        className="text-primary hover:underline"
                      >
                        abrir
                      </Link>
                    )}
                  </div>
                </div>
                {!n.lida_em && (
                  <button
                    type="button"
                    className="mt-0.5 rounded p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => readOne.mutate(n.id)}
                    title="Marcar como lida"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
