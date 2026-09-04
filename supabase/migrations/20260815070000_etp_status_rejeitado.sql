DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'etp_status' AND e.enumlabel = 'rejeitado'
  ) THEN
    ALTER TYPE public.etp_status ADD VALUE 'rejeitado';
  END IF;
END$$;
