-- Trilha de auditoria "quem marcou" para eventos reais de agenda criados a
-- partir da plataforma (Agendar entrevista, Agendar kickoff, ...). Grava
-- sempre uma linha por tentativa, com o resultado tanto do evento do próprio
-- organizador quanto da cópia espelhada na agenda do admin -- mesmo espírito
-- não-bloqueante do email_send_log (a falha vira status, nunca exceção).

CREATE TABLE IF NOT EXISTS public.calendar_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organizer_email text,
  summary text NOT NULL,
  start_at timestamptz NOT NULL,
  duration_min integer NOT NULL,
  attendees text[] NOT NULL DEFAULT '{}',
  entity_table text,
  entity_id text,
  organizer_event_id text,
  organizer_event_status text NOT NULL DEFAULT 'not_attempted'
    CHECK (organizer_event_status IN ('not_attempted', 'ok', 'failed', 'provider_not_configured')),
  organizer_event_error text,
  mirror_event_id text,
  mirror_event_status text NOT NULL DEFAULT 'not_attempted'
    CHECK (mirror_event_status IN ('not_attempted', 'ok', 'failed', 'provider_not_configured', 'disabled')),
  mirror_event_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_event_log_organizer_idx ON public.calendar_event_log(organizer_id);
CREATE INDEX IF NOT EXISTS calendar_event_log_entity_idx ON public.calendar_event_log(entity_table, entity_id);

GRANT SELECT, INSERT ON public.calendar_event_log TO authenticated;
GRANT ALL ON public.calendar_event_log TO service_role;
ALTER TABLE public.calendar_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_event_log insert self" ON public.calendar_event_log
  FOR INSERT TO authenticated WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "calendar_event_log select self or admin/manager" ON public.calendar_event_log
  FOR SELECT TO authenticated
  USING (
    organizer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  );
