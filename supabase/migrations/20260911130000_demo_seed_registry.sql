-- ============================================================================
-- Registro de conteúdo de demonstração
--
-- Toda linha inserida pelo script de seed (scripts/seed-demo-data.mjs) é
-- espelhada aqui como (table_name, record_id) — é isso que faz o botão
-- "Excluir conteúdo DEMO" em /admin/dados-demo ser confiável, sem depender de
-- convenção de nome/código (ex. "-DEMO-"), que é frágil.
-- ============================================================================

CREATE TABLE public.demo_seed_registry (
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (table_name, record_id)
);

GRANT SELECT, DELETE ON public.demo_seed_registry TO authenticated;
GRANT ALL ON public.demo_seed_registry TO service_role;
ALTER TABLE public.demo_seed_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY demo_seed_registry_admin_select ON public.demo_seed_registry
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY demo_seed_registry_admin_delete ON public.demo_seed_registry
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

NOTIFY pgrst, 'reload schema';
