import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAgendaPrefs } from "@/lib/account.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarPlus, ChevronDown, Loader2 } from "lucide-react";
import {
  buildGoogleCalendarUrl,
  buildOutlookUrl,
  downloadIcs,
  eventEnd,
  parseLocalDateTime,
  splitEmails,
  type CalendarEvent,
} from "@/lib/calendar-invite";
import { addOportunidadeNota } from "@/lib/oportunidade-notas.functions";
import { agendarEventoReal } from "@/lib/calendar.functions";
import type { OportunidadeLite } from "@/lib/oportunidades.functions";
import { cn } from "@/lib/utils";

const DURACOES = [30, 45, 60, 90, 120];

function defaultDate(): string {
  const d = new Date(Date.now() + 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmt(d: Date): string {
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Agendar entrevista técnica: 4 campos (data, hora, duração, convidados), um
 * botão principal (agenda Google) e as outras agendas num menu. Título, local e
 * pauta já vêm preenchidos e ficam em "Mais detalhes".
 */
export function AgendarEntrevista({
  opp,
  onRegistrada,
}: {
  opp: OportunidadeLite;
  onRegistrada?: () => void;
}) {
  const empresa = opp.cliente_nome || opp.empresa_lead || opp.nome_lead || "Lead";
  const [titulo, setTitulo] = useState(`Entrevista técnica — ${empresa}`);
  const [data, setData] = useState(defaultDate());
  const [hora, setHora] = useState("10:00");
  const [duracao, setDuracao] = useState("60");
  const [local, setLocal] = useState("Online (link a confirmar)");
  const [convidados, setConvidados] = useState(opp.email ?? "");
  const [pauta, setPauta] = useState(
    `Levantamento inicial para ${empresa} (${opp.codigo}).\n\nPauta:\n- Entendimento do processo e volumes\n- Requisitos técnicos e restrições de layout\n- Prazos, orçamento e próximos passos (Checklist / ETP)`,
  );
  const [maisDetalhes, setMaisDetalhes] = useState(false);

  const getPrefs = useServerFn(getMyAgendaPrefs);
  const { data: prefs } = useQuery({ queryKey: ["agenda-prefs"], queryFn: () => getPrefs({}) });

  // Aplica as preferências salvas em "Minha conta" (Google Workspace / Teams).
  useEffect(() => {
    if (!prefs) return;
    if (prefs.agenda_duracao_min) setDuracao(String(prefs.agenda_duracao_min));
    if (prefs.agenda_sala_padrao) setLocal(prefs.agenda_sala_padrao);
    if (prefs.agenda_convidados_padrao) {
      setConvidados((atual) => {
        const juntos = [
          ...splitEmails(atual),
          ...splitEmails(prefs.agenda_convidados_padrao ?? ""),
        ];
        return Array.from(new Set(juntos)).join(", ");
      });
    }
  }, [prefs]);

  const inicio = useMemo(() => parseLocalDateTime(data, hora), [data, hora]);

  const evento: CalendarEvent | null = useMemo(() => {
    if (!inicio) return null;
    return {
      title: titulo.trim() || `Entrevista — ${empresa}`,
      description: pauta.trim(),
      location: local.trim(),
      start: inicio,
      durationMin: Number(duracao),
      attendees: splitEmails(convidados),
      organizerEmail:
        (prefs?.agenda_provider === "teams"
          ? prefs?.agenda_teams_email
          : prefs?.agenda_google_email) ??
        prefs?.agenda_google_email ??
        prefs?.agenda_teams_email ??
        undefined,
    };
  }, [inicio, titulo, pauta, local, duracao, convidados, empresa, prefs]);

  const registrar = useMutation({
    mutationFn: async () => {
      if (!evento) throw new Error("Informe data e hora válidas.");
      const convidadosTxt = evento.attendees?.length ? evento.attendees.join(", ") : "—";
      await addOportunidadeNota({
        data: {
          oportunidade_id: opp.id,
          texto:
            `📅 Entrevista agendada: ${evento.title}\n` +
            `Quando: ${fmt(evento.start)} → ${fmt(eventEnd(evento))} (${evento.durationMin} min)\n` +
            `Local: ${evento.location || "—"}\n` +
            `Convidados: ${convidadosTxt}\n\n${evento.description ?? ""}`.trim(),
        },
      });
    },
    onSuccess: () => {
      toast.success("Entrevista registrada nas anotações.");
      onRegistrada?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const criarEventoFn = useServerFn(agendarEventoReal);
  const criarEvento = useMutation({
    mutationFn: async () => {
      if (!evento) throw new Error("Informe data e hora válidas.");
      return criarEventoFn({
        data: {
          categoria: "entrevista",
          summary: evento.title,
          description: evento.description ?? "",
          startISO: evento.start.toISOString(),
          durationMin: evento.durationMin,
          attendees: evento.attendees ?? [],
          entityTable: "oportunidades",
          entityId: opp.id,
        },
      });
    },
    onSuccess: (res) => {
      if (res.organizerEvent.status === "ok") {
        toast.success(
          res.mirrorEvent.status === "failed"
            ? "Evento criado na sua agenda — a cópia na agenda do administrador falhou."
            : "Evento criado na sua agenda Google.",
        );
        registrar.mutate();
      } else {
        toast.error(res.organizerEvent.detail ?? "Não foi possível criar o evento.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const abrir = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  const mailto = () => {
    if (!evento) return;
    const corpo = `Olá,\n\nGostaríamos de agendar uma entrevista técnica.\n\nQuando: ${fmt(evento.start)} (${evento.durationMin} min)\nLocal: ${evento.location || "—"}\n\n${evento.description ?? ""}\n\nAtenciosamente,\nSLTK Americas`;
    window.location.href = `mailto:${(evento.attendees ?? []).join(",")}?subject=${encodeURIComponent(evento.title)}&body=${encodeURIComponent(corpo)}`;
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="grid gap-1 col-span-2 sm:col-span-1">
          <Label className="text-xs">Data</Label>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Hora</Label>
          <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Duração</Label>
          <Select value={duracao} onValueChange={setDuracao}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURACOES.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1 col-span-2 sm:col-span-4">
          <Label className="text-xs">Convidados</Label>
          <Input
            value={convidados}
            onChange={(e) => setConvidados(e.target.value)}
            placeholder="cliente@empresa.com, engenharia@sltkamericas.com"
          />
        </div>
      </div>

      <button
        type="button"
        className="flex w-fit items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
        onClick={() => setMaisDetalhes((v) => !v)}
        aria-expanded={maisDetalhes}
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", maisDetalhes && "rotate-180")} />
        Título, local e pauta
      </button>
      {maisDetalhes && (
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label className="text-xs">Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={160} />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Local / link da reunião</Label>
            <Input value={local} onChange={(e) => setLocal(e.target.value)} maxLength={300} />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Pauta</Label>
            <Textarea
              value={pauta}
              onChange={(e) => setPauta(e.target.value)}
              rows={4}
              maxLength={3000}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={!evento || criarEvento.isPending}
          onClick={() => criarEvento.mutate()}
        >
          {criarEvento.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
          )}
          Agendar no Google
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={!evento}>
              Outras agendas <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => evento && abrir(buildGoogleCalendarUrl(evento))}>
              Google Agenda (navegador)
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => evento && abrir(buildOutlookUrl(evento, "office"))}>
              Teams / Outlook (trabalho)
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => evento && abrir(buildOutlookUrl(evento, "web"))}>
              Outlook.com
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => evento && downloadIcs(evento, `${opp.codigo}-entrevista.ics`)}
            >
              Baixar .ics
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!splitEmails(convidados).length} onSelect={mailto}>
              Enviar convite por e-mail
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-muted-foreground"
          disabled={!evento || registrar.isPending}
          onClick={() => registrar.mutate()}
        >
          {registrar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Só registrar na oportunidade
        </Button>
      </div>
    </div>
  );
}

export function AgendarEntrevistaDialog({
  open,
  onOpenChange,
  opp,
  onRegistrada,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  opp: OportunidadeLite;
  onRegistrada?: () => void;
}) {
  const empresa = opp.cliente_nome || opp.empresa_lead || opp.nome_lead || "Lead";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Agendar entrevista</DialogTitle>
          <DialogDescription>
            {empresa} · {opp.codigo}. O convite abre na conta que você já usa no navegador.
          </DialogDescription>
        </DialogHeader>
        {open && <AgendarEntrevista opp={opp} onRegistrada={onRegistrada} />}
        <DialogFooter className="sr-only" />
      </DialogContent>
    </Dialog>
  );
}
