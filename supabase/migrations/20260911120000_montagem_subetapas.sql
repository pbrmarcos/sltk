-- ============================================================================
-- Sub-etapas de montagem com checklist e evidências fotográficas
--
-- O artigo de ajuda "Kanban de montagem" já descreve esse fluxo (pré-montagem,
-- montagem mecânica, elétrica, testes internos, embalagem — cada uma com
-- checklist e anexos, bloqueando "Concluir montagem" enquanto não fecham) mas
-- nunca foi implementado: hoje "Concluir" só muda o status pra 100% sem
-- exigir nada. Esta migration constrói o que o artigo promete.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.montagem_etapa_tipo AS ENUM
    ('pre_montagem','mecanica','eletrica','testes','embalagem');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.montagem_etapa_status AS ENUM ('pendente','em_andamento','concluida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ 1) equipamento_montagem_etapas ============
CREATE TABLE public.equipamento_montagem_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  montagem_id uuid NOT NULL REFERENCES public.equipamento_montagens(id) ON DELETE CASCADE,
  equipamento_id uuid NOT NULL REFERENCES public.cliente_equipamentos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo public.montagem_etapa_tipo NOT NULL,
  ordem int NOT NULL,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  prazo date,
  status public.montagem_etapa_status NOT NULL DEFAULT 'pendente',
  concluida_em timestamptz,
  concluida_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (montagem_id, tipo)
);
CREATE INDEX idx_montagem_etapas_montagem ON public.equipamento_montagem_etapas(montagem_id);
CREATE INDEX idx_montagem_etapas_cliente ON public.equipamento_montagem_etapas(cliente_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_montagem_etapas TO authenticated;
GRANT ALL ON public.equipamento_montagem_etapas TO service_role;
ALTER TABLE public.equipamento_montagem_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY montagem_etapas_select ON public.equipamento_montagem_etapas
  FOR SELECT TO authenticated
  USING (public.can_access_cliente(cliente_id));
CREATE POLICY montagem_etapas_insert ON public.equipamento_montagem_etapas
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_cliente(cliente_id));
CREATE POLICY montagem_etapas_update ON public.equipamento_montagem_etapas
  FOR UPDATE TO authenticated
  USING (public.can_access_cliente(cliente_id))
  WITH CHECK (public.can_access_cliente(cliente_id));

CREATE TRIGGER tg_montagem_etapas_updated_at
  BEFORE UPDATE ON public.equipamento_montagem_etapas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ 2) montagem_etapa_checklist_template (global, como fat_checklist_template) ============
CREATE TABLE public.montagem_etapa_checklist_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.montagem_etapa_tipo NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  titulo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.montagem_etapa_checklist_template TO authenticated;
GRANT ALL ON public.montagem_etapa_checklist_template TO service_role;
ALTER TABLE public.montagem_etapa_checklist_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY montagem_chk_tpl_select ON public.montagem_etapa_checklist_template
  FOR SELECT TO authenticated USING (ativo);
CREATE POLICY montagem_chk_tpl_admin_write ON public.montagem_etapa_checklist_template
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER tg_montagem_chk_tpl_updated_at
  BEFORE UPDATE ON public.montagem_etapa_checklist_template
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ 3) montagem_etapa_checklist_resposta ============
CREATE TABLE public.montagem_etapa_checklist_resposta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id uuid NOT NULL REFERENCES public.equipamento_montagem_etapas(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.montagem_etapa_checklist_template(id) ON DELETE RESTRICT,
  ok boolean NOT NULL DEFAULT false,
  observacao text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (etapa_id, template_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.montagem_etapa_checklist_resposta TO authenticated;
GRANT ALL ON public.montagem_etapa_checklist_resposta TO service_role;
ALTER TABLE public.montagem_etapa_checklist_resposta ENABLE ROW LEVEL SECURITY;

CREATE POLICY montagem_chk_resp_rw ON public.montagem_etapa_checklist_resposta
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.equipamento_montagem_etapas e
    WHERE e.id = etapa_id AND public.can_access_cliente(e.cliente_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.equipamento_montagem_etapas e
    WHERE e.id = etapa_id AND public.can_access_cliente(e.cliente_id)
  ));

CREATE TRIGGER tg_montagem_chk_resp_updated_at
  BEFORE UPDATE ON public.montagem_etapa_checklist_resposta
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ 4) montagem_etapa_evidencias ============
CREATE TABLE public.montagem_etapa_evidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id uuid NOT NULL REFERENCES public.equipamento_montagem_etapas(id) ON DELETE CASCADE,
  equipamento_id uuid NOT NULL REFERENCES public.cliente_equipamentos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  mime text NOT NULL,
  tamanho_bytes bigint NOT NULL,
  storage_path text NOT NULL,
  descricao text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT montagem_evid_mime_ok CHECK (mime IN ('application/pdf','image/png','image/jpeg')),
  CONSTRAINT montagem_evid_size_ok CHECK (tamanho_bytes > 0 AND tamanho_bytes <= 26214400)
);
CREATE INDEX idx_montagem_evid_etapa ON public.montagem_etapa_evidencias(etapa_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.montagem_etapa_evidencias TO authenticated;
GRANT ALL ON public.montagem_etapa_evidencias TO service_role;
ALTER TABLE public.montagem_etapa_evidencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY montagem_evid_select ON public.montagem_etapa_evidencias
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_cliente(cliente_id));
CREATE POLICY montagem_evid_insert ON public.montagem_etapa_evidencias
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_cliente(cliente_id));
-- Só admin/manager podem remover evidência (soft delete via UPDATE) — preserva
-- rastreabilidade, mesmo espírito de fat_evid_delete no bucket fat-evidencias.
CREATE POLICY montagem_evid_delete ON public.montagem_etapa_evidencias
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));

-- ============ 5) Storage bucket 'montagem-evidencias' (criado fora do código, no Studio) ============
CREATE POLICY "montagem_evid_storage_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'montagem-evidencias' AND (
    public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'manager'::public.app_role)
    OR public.can_access_module(auth.uid(),'producao'::public.app_module)
  ));
CREATE POLICY "montagem_evid_storage_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'montagem-evidencias' AND (
    public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'manager'::public.app_role)
    OR public.can_access_module(auth.uid(),'producao'::public.app_module)
  ));
CREATE POLICY "montagem_evid_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'montagem-evidencias' AND (
    public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'manager'::public.app_role)
  ));

-- ============ 6) Seed do checklist (3 itens x 5 tipos) ============
INSERT INTO public.montagem_etapa_checklist_template (tipo, ordem, titulo) VALUES
('pre_montagem', 1, 'Kit de peças conferido contra a lista de materiais'),
('pre_montagem', 2, 'Bancada e ferramentas preparadas'),
('pre_montagem', 3, 'Desenho de fabricação em revisão vigente disponível'),
('mecanica', 1, 'Estrutura montada conforme desenho mecânico'),
('mecanica', 2, 'Torque dos parafusos estruturais conferido'),
('mecanica', 3, 'Alinhamento e nivelamento verificados'),
('eletrica', 1, 'Cabeamento conforme diagrama elétrico'),
('eletrica', 2, 'Aterramento e equipotencialização verificados'),
('eletrica', 3, 'Continuidade e isolação testadas'),
('testes', 1, 'Testes funcionais a seco realizados'),
('testes', 2, 'Testes com carga/processo simulado realizados'),
('testes', 3, 'Não conformidades encontradas tratadas ou registradas'),
('embalagem', 1, 'Limpeza final do equipamento realizada'),
('embalagem', 2, 'Embalagem/proteção para transporte aplicada'),
('embalagem', 3, 'Manuais e acessórios inclusos conferidos');

-- ============ 7) Backfill: 5 etapas pendentes pra toda montagem já existente ============
INSERT INTO public.equipamento_montagem_etapas (montagem_id, equipamento_id, cliente_id, tipo, ordem)
SELECT m.id, m.equipamento_id, m.cliente_id, t.tipo, t.ordem
FROM public.equipamento_montagens m
CROSS JOIN (VALUES
  ('pre_montagem'::public.montagem_etapa_tipo, 1),
  ('mecanica'::public.montagem_etapa_tipo, 2),
  ('eletrica'::public.montagem_etapa_tipo, 3),
  ('testes'::public.montagem_etapa_tipo, 4),
  ('embalagem'::public.montagem_etapa_tipo, 5)
) AS t(tipo, ordem)
WHERE m.deleted_at IS NULL
ON CONFLICT (montagem_id, tipo) DO NOTHING;

NOTIFY pgrst, 'reload schema';
