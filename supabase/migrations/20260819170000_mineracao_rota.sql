-- Mineração: modo rota comercial (origem → destino), anotações e cota diária.

ALTER TABLE public.mineracao_campanhas
  ADD COLUMN IF NOT EXISTS pais_origem text,
  ADD COLUMN IF NOT EXISTS pais_destino text,
  ADD COLUMN IF NOT EXISTS truncado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS limite_base integer;

ALTER TABLE public.mineracao_resultados
  ADD COLUMN IF NOT EXISTS anotacao text,
  ADD COLUMN IF NOT EXISTS papel text;

CREATE TABLE IF NOT EXISTS public.mineracao_consultas (
  dia date PRIMARY KEY,
  total integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mineracao_consultas TO authenticated;
GRANT ALL ON public.mineracao_consultas TO service_role;
ALTER TABLE public.mineracao_consultas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mineracao_consultas_comercial" ON public.mineracao_consultas;
CREATE POLICY "mineracao_consultas_comercial" ON public.mineracao_consultas FOR SELECT TO authenticated
  USING (public.can_access_module(auth.uid(), 'comercial')
         OR public.has_role(auth.uid(), 'admin')
         OR public.has_role(auth.uid(), 'manager'));

-- Consome N chamadas da cota diária; lança exceção quando o limite é atingido.
CREATE OR REPLACE FUNCTION public.mineracao_consumir_consultas(_chamadas integer DEFAULT 1)
RETURNS TABLE (usadas integer, limite integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limite integer;
  v_total integer;
BEGIN
  IF NOT public.can_access_module(auth.uid(), 'comercial')
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'manager') THEN
    RAISE EXCEPTION 'Acesso restrito ao time comercial.';
  END IF;

  SELECT c.limite_consultas_dia INTO v_limite
    FROM public.mineracao_config c WHERE c.singleton = true;
  v_limite := COALESCE(v_limite, 1000);

  INSERT INTO public.mineracao_consultas (dia, total)
       VALUES (current_date, 0)
  ON CONFLICT (dia) DO NOTHING;

  SELECT m.total INTO v_total FROM public.mineracao_consultas m
   WHERE m.dia = current_date FOR UPDATE;

  IF v_total + GREATEST(_chamadas, 1) > v_limite THEN
    RAISE EXCEPTION 'Limite diário de % consultas à mineração atingido (% já usadas hoje). Tente novamente amanhã.', v_limite, v_total;
  END IF;

  UPDATE public.mineracao_consultas
     SET total = total + GREATEST(_chamadas, 1), updated_at = now()
   WHERE dia = current_date
   RETURNING total INTO v_total;

  RETURN QUERY SELECT v_total, v_limite;
END;
$$;

REVOKE ALL ON FUNCTION public.mineracao_consumir_consultas(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.mineracao_consumir_consultas(integer) TO authenticated;
