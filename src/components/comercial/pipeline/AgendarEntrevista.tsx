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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarPlus, Download, Loader2, Mail } from "lucide-react";
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
import type { OportunidadeLite } from "@/lib/oportunidades.functions";

const DURACOES = [30, 45, 60, 90, 120];

function defaultDate(): string {
  const d = new Date(Date.now() + 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmt(d: Date): string {
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

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

  const getPrefs = useServerFn(getMyAgendaPrefs);
  const { data: prefs } = useQuery({ queryKey: ["agenda-prefs"], queryFn: () => getPrefs({}) });

  // Aplica as preferências salvas em "Minha conta" (Google Workspace / Teams).
  useEffect(() => {
    if (!prefs) return;
    if (prefs.agenda_duracao_min) setDuracao(String(prefs.agenda_duracao_min));
    if (prefs.agenda_sala_padrao) setLocal(prefs.agenda_sala_padrao);
    if (prefs.agenda_convidados_padrao) {
      setConvidados((atual) => {
        const juntos = [...splitEmails(atual), ...splitEmails(prefs.agenda_convidados_padrao ?? "")];
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
        (prefs?.agenda_provider === "teams" ? prefs?.agenda_teams_email : prefs?.agenda_google_email) ??
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

  const abrir = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  const mailto = () => {
    if (!evento) return;
    const corpo = `Olá,\n\nGostaríamos de agendar uma entrevista técnica.\n\nQuando: ${fmt(evento.start)} (${evento.durationMin} min)\nLocal: ${evento.location || "—"}\n\n${evento.description ?? ""}\n\nAtenciosamente,\nSLTK Americas`;
    window.location.href = `mailto:${(evento.attendees ?? []).join(",")}?subject=${encodeURIComponent(evento.title)}&body=${encodeURIComponent(corpo)}`;
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="text-xs">Título</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={160} />
        </div>
        <div>
          <Label className="text-xs">Data</Label>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Hora</Label>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Duração</Label>
            <Select value={duracao} onValueChange={setDuracao}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURACOES.map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Local / link da reunião</Label>
          <Input value={local} onChange={(e) => setLocal(e.target.value)} maxLength={300} />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Convidados (e-mails separados por vírgula)</Label>
          <Input
            value={convidados}
            onChange={(e) => setConvidados(e.target.value)}
            placeholder="cliente@empresa.com, engenharia@sltkamericas.com"
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Pauta / descrição</Label>
          <Textarea value={pauta} onChange={(e) => setPauta(e.target.value)} rows={5} maxLength={3000} />
        </div>
      </div>

      <div className="rounded-lg border bg-muted/40 p-3 text-[12px] text-muted-foreground">
        {evento
          ? <>Reunião em <strong className="text-foreground">{fmt(evento.start)}</strong> até <strong className="text-foreground">{fmt(eventEnd(evento))}</strong>. O convite abre na conta que você já usa no navegador.</>
          : "Informe uma data e hora válidas para gerar o convite."}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={prefs?.agenda_provider === "teams" ? "outline" : "default"}
          disabled={!evento}
          onClick={() => evento && abrir(buildGoogleCalendarUrl(evento))}
        >
          <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Google Agenda
        </Button>
        <Button
          size="sm"
          variant={prefs?.agenda_provider === "teams" ? "default" : "outline"}
          disabled={!evento}
          onClick={() => evento && abrir(buildOutlookUrl(evento, "office"))}
        >
          <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Teams / Outlook (trabalho)
        </Button>
        <Button size="sm" variant="outline" disabled={!evento} onClick={() => evento && abrir(buildOutlookUrl(evento, "web"))}>
          <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Outlook.com
        </Button>
        <Button size="sm" variant="outline" disabled={!evento} onClick={() => evento && downloadIcs(evento, `${opp.codigo}-entrevista.ics`)}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar .ics
        </Button>
        <Button size="sm" variant="outline" disabled={!evento || !splitEmails(convidados).length} onClick={mailto}>
          <Mail className="mr-1.5 h-3.5 w-3.5" /> Enviar por e-mail
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!evento || registrar.isPending}
          onClick={() => registrar.mutate()}
        >
          {registrar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Registrar na oportunidade
        </Button>
      </div>
    </div>
  );
}
