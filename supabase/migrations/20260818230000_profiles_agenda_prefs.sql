-- Preferências de agendamento (Google Workspace / Microsoft Teams) por usuário
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agenda_provider text NOT NULL DEFAULT 'google',
  ADD COLUMN IF NOT EXISTS agenda_google_email text,
  ADD COLUMN IF NOT EXISTS agenda_teams_email text,
  ADD COLUMN IF NOT EXISTS agenda_teams_tenant text,
  ADD COLUMN IF NOT EXISTS agenda_sala_padrao text,
  ADD COLUMN IF NOT EXISTS agenda_convidados_padrao text,
  ADD COLUMN IF NOT EXISTS agenda_duracao_min integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS agenda_fuso text NOT NULL DEFAULT 'America/Sao_Paulo';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_agenda_provider_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_agenda_provider_check
      CHECK (agenda_provider IN ('google', 'teams', 'ambos'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_agenda_duracao_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_agenda_duracao_check
      CHECK (agenda_duracao_min BETWEEN 15 AND 480);
  END IF;
END $$;
