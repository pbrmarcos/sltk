import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAgendaPrefs } from "@/lib/account.functions";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarPlus, Download, Mail } from "lucide-react";
import {
  buildGoogleCalendarUrl,
  buildOutlookUrl,
  downloadIcs,
  eventEnd,
  parseLocalDateTime,
  splitEmails,
  type CalendarEvent,
} from "@/lib/calendar-invite";
import { useFormDraft } from "@/hooks/use-form-draft";
import { confirmDiscard } from "@/lib/unsaved-guard";

const DURACOES = [30, 60, 90, 120];

function defaultDate(): string {
  const d = new Date(Date.now() + 3 * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmt(d: Date): string {
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function AgendarKickoff({
  cliente,
  equipamento,
  versao,
}: {
  cliente: string;
  equipamento: string;
  versao: number;
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState(`Kickoff de projeto — ${equipamento} (${cliente})`);
  const [data, setData] = useState(defaultDate());
  const [hora, setHora] = useState("09:00");
  const [duracao, setDuracao] = useState("90");
  const [local, setLocal] = useState("Online (link a confirmar)");
  const [convidados, setConvidados] = useState("");
  const [pauta, setPauta] = useState(
    `Kickoff do projeto após aprovação do ETP v${versao}.\n\nPauta:\n- Escopo aprovado, premissas e exclusões\n- Cronograma macro e marcos de engenharia\n- Responsáveis (comercial, engenharia, cliente)\n- Riscos, pendências e próximos passos`,
  );
  const initialDraft = useMemo(
    () => ({
      titulo: `Kickoff de projeto — ${equipamento} (${cliente})`,
      data: defaultDate(),
      hora: "09:00",
      duracao: "90",
      local: "Online (link a confirmar)",
      convidados: "",
      pauta: `Kickoff do projeto após aprovação do ETP v${versao}.\n\nPauta:\n- Escopo aprovado, premissas e exclusões\n- Cronograma macro e marcos de engenharia\n- Responsáveis (comercial, engenharia, cliente)\n- Riscos, pendências e próximos passos`,
    }),
    [cliente, equipamento, versao],
  );
  const currentDraft = { titulo, data, hora, duracao, local, convidados, pauta };
  const { clearDraft, isDirty } = useFormDraft({
    formKey: `kickoff:${cliente}:${equipamento}:${versao}`,
    value: currentDraft,
    initialValue: initialDraft,
    enabled: open,
    onRestore: (saved) => {
      setTitulo(saved.titulo);
      setData(saved.data);
      setHora(saved.hora);
      setDuracao(saved.duracao);
      setLocal(saved.local);
      setConvidados(saved.convidados);
      setPauta(saved.pauta);
    },
  });

  function requestClose() {
    if (!confirmDiscard(isDirty)) return;
    clearDraft();
    setOpen(false);
  }

  const getPrefs = useServerFn(getMyAgendaPrefs);
  const { data: prefs } = useQuery({ queryKey: ["agenda-prefs"], queryFn: () => getPrefs({}) });

  // Preferências de agendamento definidas em "Minha conta".
  useEffect(() => {
    if (!prefs) return;
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
      title: titulo.trim() || `Kickoff — ${equipamento}`,
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
  }, [inicio, titulo, pauta, local, duracao, convidados, equipamento]);

  const abrir = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  const mailto = () => {
    if (!evento) return;
    const corpo = `Olá,\n\nConvite para o kickoff do projeto.\n\nQuando: ${fmt(evento.start)} (${evento.durationMin} min)\nLocal: ${evento.location || "—"}\n\n${evento.description ?? ""}\n\nAtenciosamente,\nSLTK Americas`;
    window.location.href = `mailto:${(evento.attendees ?? []).join(",")}?subject=${encodeURIComponent(evento.title)}&body=${encodeURIComponent(corpo)}`;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setOpen(true);
        else requestClose();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarPlus className="mr-1.5 h-4 w-4" /> Agendar kickoff
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Agendar kickoff do projeto</DialogTitle>
          <DialogDescription>
            Envie o convite para a agenda corporativa (Google ou Outlook) ou baixe o arquivo .ics.
          </DialogDescription>
        </DialogHeader>

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
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Local / link da reunião</Label>
            <Input value={local} onChange={(e) => setLocal(e.target.value)} maxLength={300} />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">
              Convidados (comercial, engenharia, cliente — separados por vírgula)
            </Label>
            <Input
              value={convidados}
              onChange={(e) => setConvidados(e.target.value)}
              placeholder="comercial@sltkamericas.com, engenharia@sltkamericas.com, cliente@empresa.com"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Pauta</Label>
            <Textarea rows={6} value={pauta} onChange={(e) => setPauta(e.target.value)} />
          </div>
        </div>

        {evento ? (
          <p className="text-xs text-muted-foreground">
            {fmt(evento.start)} → {fmt(eventEnd(evento))}
          </p>
        ) : (
          <p className="text-xs text-amber-700">Informe data e hora válidas.</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!evento}
            onClick={() => evento && abrir(buildGoogleCalendarUrl(evento))}
          >
            <CalendarPlus className="mr-1.5 h-4 w-4" /> Google Agenda
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!evento}
            onClick={() => evento && abrir(buildOutlookUrl(evento, "office"))}
          >
            Outlook (trabalho)
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!evento}
            onClick={() => evento && downloadIcs(evento, "kickoff.ics")}
          >
            <Download className="mr-1.5 h-4 w-4" /> .ics
          </Button>
          <Button size="sm" variant="ghost" disabled={!evento} onClick={mailto}>
            <Mail className="mr-1.5 h-4 w-4" /> E-mail
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
