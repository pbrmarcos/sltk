
-- Tighten history INSERT policy
DROP POLICY IF EXISTS "opp history insert system" ON public.oportunidade_stage_history;
CREATE POLICY "opp history insert own" ON public.oportunidade_stage_history
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.oportunidades o
    WHERE o.id = oportunidade_id
      AND (
        public.has_role(auth.uid(),'admin'::app_role)
        OR public.has_role(auth.uid(),'manager'::app_role)
        OR o.responsavel_id = auth.uid()
      )
  )
);

-- Fix search_path on derive_lifecycle
CREATE OR REPLACE FUNCTION public.derive_lifecycle(_stage public.pipeline_stage)
RETURNS public.lifecycle_stage
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _stage
    WHEN 'novo' THEN 'suspect'::public.lifecycle_stage
    WHEN 'qualificado' THEN 'prospect'::public.lifecycle_stage
    WHEN 'proposta' THEN 'prospect'::public.lifecycle_stage
    WHEN 'negociacao' THEN 'prospect'::public.lifecycle_stage
    WHEN 'ganho' THEN 'cliente'::public.lifecycle_stage
    WHEN 'perdido' THEN 'prospect'::public.lifecycle_stage
  END
$$;
