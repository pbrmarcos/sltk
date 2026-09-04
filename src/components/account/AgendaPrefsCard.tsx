import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarClock, Loader2 } from "lucide-react";
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
import { getMyAgendaPrefs, updateMyAgendaPrefs, type AgendaPrefs } from "@/lib/account.functions";

const FUSOS = [
  "America/Sao_Paulo",
  "America/Bogota",
  "America/Santiago",
  "America/Mexico_City",
  "America/New_York",
  "Europe/Lisbon",
  "Europe/Madrid",
  "UTC",
];

const DURACOES = [30, 45, 60, 90, 120];

const VAZIO: AgendaPrefs = {
  agenda_provider: "google",
  agenda_google_email: null,
  agenda_teams_email: null,
  agenda_teams_tenant: null,
  agenda_sala_padrao: null,
  agenda_convidados_padrao: null,
  agenda_duracao_min: 60,
  agenda_fuso: "America/Sao_Paulo",
};

export function AgendaPrefsCard() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMyAgendaPrefs);
  const saveFn = useServerFn(updateMyAgendaPrefs);

  const { data, isLoading } = useQuery({
    queryKey: ["agenda-prefs"],
    queryFn: () => getFn({}),
  });

  const [form, setForm] = useState<AgendaPrefs>(VAZIO);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const set = <K extends keyof AgendaPrefs>(k: K, v: AgendaPrefs[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => {
      toast.success("Preferências de agenda salvas");
      qc.invalidateQueries({ queryKey: ["agenda-prefs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mostraGoogle = form.agenda_provider !== "teams";
  const mostraTeams = form.agenda_provider !== "google";

  return (
    <section className="md:col-span-2 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]">
      <div className="mb-1 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-[var(--text-muted)]" />
        <h2 className="text-sm font-semibold">Agendamento de eventos</h2>
      </div>
      <p className="mb-4 text-[12px] text-[var(--text-muted)]">
        Usado ao agendar entrevistas, reuniões de kickoff e demais eventos. Contas corporativas
        Google Workspace e Microsoft Teams (Microsoft 365).
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Provedor preferido</Label>
            <Select
              value={form.agenda_provider}
              onValueChange={(v) => set("agenda_provider", v as AgendaPrefs["agenda_provider"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google Agenda (Workspace)</SelectItem>
                <SelectItem value="teams">Microsoft Teams / Outlook</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Duração padrão</Label>
            <Select
              value={String(form.agenda_duracao_min)}
              onValueChange={(v) => set("agenda_duracao_min", Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURACOES.map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mostraGoogle && (
            <div className="space-y-1.5">
              <Label htmlFor="ag-google">E-mail Google Workspace (organizador)</Label>
              <Input
                id="ag-google"
                value={form.agenda_google_email ?? ""}
                placeholder="voce@sltkamericas.com"
                onChange={(e) => set("agenda_google_email", e.target.value)}
              />
              <p className="text-[11px] text-[var(--text-muted)]">
                Conta que criará o evento e a sala do Google Meet.
              </p>
            </div>
          )}

          {mostraTeams && (
            <div className="space-y-1.5">
              <Label htmlFor="ag-teams">E-mail / UPN do Microsoft Teams</Label>
              <Input
                id="ag-teams"
                value={form.agenda_teams_email ?? ""}
                placeholder="voce@sltkamericas.com"
                onChange={(e) => set("agenda_teams_email", e.target.value)}
              />
              <p className="text-[11px] text-[var(--text-muted)]">
                Conta Microsoft 365 usada no Outlook/Teams corporativo.
              </p>
            </div>
          )}

          {mostraTeams && (
            <div className="space-y-1.5">
              <Label htmlFor="ag-tenant">Domínio / tenant da organização</Label>
              <Input
                id="ag-tenant"
                value={form.agenda_teams_tenant ?? ""}
                placeholder="sltkamericas.com"
                onChange={(e) => set("agenda_teams_tenant", e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Fuso horário</Label>
            <Select value={form.agenda_fuso} onValueChange={(v) => set("agenda_fuso", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FUSOS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="ag-sala">Link de sala padrão (Meet / Teams)</Label>
            <Input
              id="ag-sala"
              value={form.agenda_sala_padrao ?? ""}
              placeholder="https://meet.google.com/abc-defg-hij ou https://teams.microsoft.com/l/meetup-join/…"
              onChange={(e) => set("agenda_sala_padrao", e.target.value)}
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="ag-conv">Convidados sempre incluídos</Label>
            <Textarea
              id="ag-conv"
              rows={2}
              value={form.agenda_convidados_padrao ?? ""}
              placeholder="comercial@sltkamericas.com, engenharia@sltkamericas.com"
              onChange={(e) => set("agenda_convidados_padrao", e.target.value)}
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <Button size="sm" disabled={mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? "Salvando…" : "Salvar agendamento"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
