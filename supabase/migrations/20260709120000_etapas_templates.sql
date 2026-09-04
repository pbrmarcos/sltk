-- ============================================================================
-- Templates editáveis de etapas por tipo de equipamento
-- ============================================================================

-- 1) Tabela raiz do template
CREATE TABLE IF NOT EXISTS public.etapa_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_id uuid REFERENCES public.rfq_formulario_tipo(id) ON DELETE SET NULL,
  slug text UNIQUE NOT NULL,
  nome text NOT NULL,
  familia text,
  descricao text,
  publicado boolean NOT NULL DEFAULT false,
  versao_atual int NOT NULL DEFAULT 1,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_etapa_template_tipo ON public.etapa_template(tipo_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_etapa_template_slug ON public.etapa_template(slug) WHERE deleted_at IS NULL;

-- 2) Itens (etapas) do template
CREATE TABLE IF NOT EXISTS public.etapa_template_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.etapa_template(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.etapa_template_item(id) ON DELETE CASCADE,
  disciplina text NOT NULL CHECK (disciplina IN ('planejamento','engenharia','producao','qualidade','pos_venda')),
  ordem int NOT NULL DEFAULT 0,
  titulo text NOT NULL,
  descricao text,
  prioridade text NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta','urgente')),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_etapa_template_item_tpl ON public.etapa_template_item(template_id, disciplina, ordem) WHERE deleted_at IS NULL;

-- 3) BOM sugerido do template
CREATE TABLE IF NOT EXISTS public.etapa_template_bom_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.etapa_template(id) ON DELETE CASCADE,
  equipamento_disciplina text NOT NULL DEFAULT 'engenharia',
  disciplina_projeto text NOT NULL DEFAULT 'mecanico' CHECK (disciplina_projeto IN ('mecanico','eletrico','automacao','montagem','outro')),
  descricao text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  unidade text NOT NULL DEFAULT 'un',
  criticidade text NOT NULL DEFAULT 'media' CHECK (criticidade IN ('baixa','media','alta','urgente')),
  ordem int NOT NULL DEFAULT 0,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_etapa_template_bom_tpl ON public.etapa_template_bom_item(template_id) WHERE deleted_at IS NULL;

-- 4) Versões (snapshots para revert)
CREATE TABLE IF NOT EXISTS public.etapa_template_versao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.etapa_template(id) ON DELETE CASCADE,
  versao int NOT NULL,
  snapshot jsonb NOT NULL,
  comentario text,
  actor_user_id uuid,
  actor_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, versao)
);
CREATE INDEX IF NOT EXISTS idx_etapa_template_versao_tpl ON public.etapa_template_versao(template_id, versao DESC);

-- Grants + RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etapa_template TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etapa_template_item TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etapa_template_bom_item TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etapa_template_versao TO authenticated;
GRANT ALL ON public.etapa_template, public.etapa_template_item, public.etapa_template_bom_item, public.etapa_template_versao TO service_role;

ALTER TABLE public.etapa_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapa_template_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapa_template_bom_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapa_template_versao ENABLE ROW LEVEL SECURITY;

-- Helper: pode gerenciar template?
CREATE OR REPLACE FUNCTION public.can_manage_etapa_template()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR public.has_role(auth.uid(), 'engineer'::app_role);
$$;

-- Policies etapa_template
DROP POLICY IF EXISTS "tpl leitura autenticada" ON public.etapa_template;
CREATE POLICY "tpl leitura autenticada" ON public.etapa_template
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
DROP POLICY IF EXISTS "tpl gestao" ON public.etapa_template;
CREATE POLICY "tpl gestao" ON public.etapa_template
  FOR ALL TO authenticated
  USING (public.can_manage_etapa_template())
  WITH CHECK (public.can_manage_etapa_template());

-- Policies etapa_template_item
DROP POLICY IF EXISTS "tpl_item leitura" ON public.etapa_template_item;
CREATE POLICY "tpl_item leitura" ON public.etapa_template_item
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
DROP POLICY IF EXISTS "tpl_item gestao" ON public.etapa_template_item;
CREATE POLICY "tpl_item gestao" ON public.etapa_template_item
  FOR ALL TO authenticated
  USING (public.can_manage_etapa_template())
  WITH CHECK (public.can_manage_etapa_template());

-- Policies etapa_template_bom_item
DROP POLICY IF EXISTS "tpl_bom leitura" ON public.etapa_template_bom_item;
CREATE POLICY "tpl_bom leitura" ON public.etapa_template_bom_item
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
DROP POLICY IF EXISTS "tpl_bom gestao" ON public.etapa_template_bom_item;
CREATE POLICY "tpl_bom gestao" ON public.etapa_template_bom_item
  FOR ALL TO authenticated
  USING (public.can_manage_etapa_template())
  WITH CHECK (public.can_manage_etapa_template());

-- Policies etapa_template_versao
DROP POLICY IF EXISTS "tpl_ver leitura" ON public.etapa_template_versao;
CREATE POLICY "tpl_ver leitura" ON public.etapa_template_versao
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tpl_ver gestao" ON public.etapa_template_versao;
CREATE POLICY "tpl_ver gestao" ON public.etapa_template_versao
  FOR ALL TO authenticated
  USING (public.can_manage_etapa_template())
  WITH CHECK (public.can_manage_etapa_template());

-- Touch trigger
CREATE OR REPLACE FUNCTION public.tg_etapa_template_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_etapa_template_touch ON public.etapa_template;
CREATE TRIGGER trg_etapa_template_touch BEFORE UPDATE ON public.etapa_template
  FOR EACH ROW EXECUTE FUNCTION public.tg_etapa_template_touch();

-- ============================================================================
-- Função de importação: clona template para o equipamento
-- ============================================================================
CREATE OR REPLACE FUNCTION public.import_etapas_do_template(_eq_id uuid, _tipo_slug text DEFAULT NULL)
RETURNS TABLE(etapas_criadas int, bom_criados int, template_usado uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_eq record;
  v_uid uuid := auth.uid();
  v_tpl_id uuid;
  v_tipo_id uuid;
  v_proj_mec uuid;
  v_proj_ele uuid;
  v_slug text := _tipo_slug;
  v_etapas int := 0;
  v_bom int := 0;
BEGIN
  SELECT * INTO v_eq FROM public.cliente_equipamentos WHERE id = _eq_id;
  IF v_eq IS NULL THEN RETURN; END IF;

  -- Já tem etapas? sai
  IF EXISTS (SELECT 1 FROM public.equipamento_disciplina_etapas WHERE equipamento_id = _eq_id AND deleted_at IS NULL LIMIT 1) THEN
    RETURN QUERY SELECT 0, 0, NULL::uuid;
    RETURN;
  END IF;

  -- Achar template publicado: por slug do planejamento_template ou pelo tipo do equipamento
  IF v_slug IS NULL THEN
    v_slug := v_eq.planejamento_template_slug;
  END IF;

  SELECT id INTO v_tpl_id FROM public.etapa_template
    WHERE deleted_at IS NULL AND publicado = true AND slug = v_slug
    LIMIT 1;

  IF v_tpl_id IS NULL AND v_slug IS NOT NULL THEN
    SELECT id INTO v_tipo_id FROM public.rfq_formulario_tipo WHERE slug = v_slug OR codigo = v_slug LIMIT 1;
    IF v_tipo_id IS NOT NULL THEN
      SELECT id INTO v_tpl_id FROM public.etapa_template
        WHERE deleted_at IS NULL AND publicado = true AND tipo_id = v_tipo_id
        LIMIT 1;
    END IF;
  END IF;

  -- Sem template publicado? Fallback para função antiga.
  IF v_tpl_id IS NULL THEN
    PERFORM public.seed_equipamento_disciplinas(_eq_id);
    RETURN QUERY SELECT
      (SELECT count(*)::int FROM public.equipamento_disciplina_etapas WHERE equipamento_id = _eq_id),
      (SELECT count(*)::int FROM public.projeto_insumos WHERE equipamento_id = _eq_id AND deleted_at IS NULL),
      NULL::uuid;
    RETURN;
  END IF;

  -- Criar projetos R00
  INSERT INTO public.equipamento_projetos (equipamento_id, cliente_id, disciplina, revisao, status, created_by)
    VALUES (_eq_id, v_eq.cliente_id, 'mecanico'::public.projeto_disciplina, 'R00', 'em_elaboracao'::public.projeto_status, v_uid)
    ON CONFLICT (equipamento_id, disciplina, revisao) DO UPDATE SET deleted_at = NULL
    RETURNING id INTO v_proj_mec;
  INSERT INTO public.equipamento_projetos (equipamento_id, cliente_id, disciplina, revisao, status, created_by)
    VALUES (_eq_id, v_eq.cliente_id, 'eletrico'::public.projeto_disciplina, 'R00', 'em_elaboracao'::public.projeto_status, v_uid)
    ON CONFLICT (equipamento_id, disciplina, revisao) DO UPDATE SET deleted_at = NULL
    RETURNING id INTO v_proj_ele;

  -- Clonar itens (sem parent primeiro, depois subtarefas)
  WITH ins AS (
    INSERT INTO public.equipamento_disciplina_etapas
      (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by)
    SELECT _eq_id, ti.disciplina, ti.ordem, ti.titulo, ti.descricao, ti.prioridade, v_uid
    FROM public.etapa_template_item ti
    WHERE ti.template_id = v_tpl_id AND ti.deleted_at IS NULL AND ti.parent_id IS NULL
    RETURNING 1
  ) SELECT count(*) INTO v_etapas FROM ins;

  -- BOM
  WITH ins AS (
    INSERT INTO public.projeto_insumos
      (projeto_id, cliente_id, equipamento_id, equipamento_disciplina, disciplina, descricao, quantidade, unidade, criticidade, status, created_by)
    SELECT CASE WHEN b.disciplina_projeto = 'eletrico' THEN v_proj_ele ELSE v_proj_mec END,
           v_eq.cliente_id, _eq_id, b.equipamento_disciplina, b.disciplina_projeto,
           b.descricao, b.quantidade, b.unidade, b.criticidade, 'rascunho', v_uid
    FROM public.etapa_template_bom_item b
    WHERE b.template_id = v_tpl_id AND b.deleted_at IS NULL
    RETURNING 1
  ) SELECT count(*) INTO v_bom FROM ins;

  RETURN QUERY SELECT v_etapas, v_bom, v_tpl_id;
END $$;

GRANT EXECUTE ON FUNCTION public.import_etapas_do_template(uuid, text) TO authenticated, service_role;

-- ============================================================================
-- Remover trigger automático na criação do equipamento
-- ============================================================================
DROP TRIGGER IF EXISTS trg_cliente_equipamentos_seed_disc ON public.cliente_equipamentos;

-- ============================================================================
-- Seed inicial: criar template rascunho para cada tipo RFQ ativo
-- ============================================================================
DO $seed$
DECLARE
  t record;
  v_tpl_id uuid;
BEGIN
  FOR t IN SELECT id, slug, codigo, nome_pt, familia FROM public.rfq_formulario_tipo WHERE ativo = true ORDER BY nome_pt LOOP
    -- Cria (se não existir) um template ligado a esse tipo
    INSERT INTO public.etapa_template (tipo_id, slug, nome, familia, descricao, publicado)
    VALUES (t.id, COALESCE(t.slug, t.codigo), t.nome_pt, t.familia, 'Template padrão gerado automaticamente.', true)
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO v_tpl_id;

    IF v_tpl_id IS NULL THEN CONTINUE; END IF;

    -- Etapas base (mesmo conteúdo da seed_equipamento_disciplinas)
    INSERT INTO public.etapa_template_item (template_id, disciplina, ordem, titulo, descricao, prioridade) VALUES
      (v_tpl_id,'planejamento',1,'Kick-off com cliente','Reunião de arranque: escopo, cronograma-macro, papéis.','alta'),
      (v_tpl_id,'planejamento',2,'ETP aprovado pelo cliente','Especificação Técnica do Produto revisada e aprovada.','alta'),
      (v_tpl_id,'planejamento',3,'Layout preliminar aprovado','Área ocupada, altura livre, acessos, integração à linha.','media'),
      (v_tpl_id,'planejamento',4,'Cronograma-macro publicado','Marcos até FAT e entrega.','media'),
      (v_tpl_id,'planejamento',5,'Confirmação de utilidades','Elétrica, ar comprimido, água, dreno.','media'),
      (v_tpl_id,'engenharia',1,'Concepção mecânica','Diagrama funcional e princípios de operação.','alta'),
      (v_tpl_id,'engenharia',2,'Modelagem 3D','Modelagem completa em CAD (SolidWorks/Inventor).','alta'),
      (v_tpl_id,'engenharia',3,'Detalhamento e desenhos 2D','Desenhos para fabricação com tolerâncias.','media'),
      (v_tpl_id,'engenharia',4,'Lista de peças (BOM mecânico)','Fechamento do BOM de mecânica e envio para insumos.','alta'),
      (v_tpl_id,'engenharia',5,'Revisão crítica de projeto','Design review antes de liberar produção.','media'),
      (v_tpl_id,'engenharia',6,'Liberação para produção','R00 aprovada, arquivos publicados.','alta'),
      (v_tpl_id,'producao',1,'Diagrama unifilar e potência instalada','Dimensionamento da entrada e distribuição.','alta'),
      (v_tpl_id,'producao',2,'Dimensionamento do painel elétrico','Envelope térmico, IP, componentes principais.','alta'),
      (v_tpl_id,'producao',3,'Lista de I/O e P&ID elétrico','Sensores, atuadores, botoeiras, mapeamento CLP.','media'),
      (v_tpl_id,'producao',4,'Programação CLP','Lógica principal, alarmes, receitas.','alta'),
      (v_tpl_id,'producao',5,'Programação IHM','Telas, permissões, integração com CLP.','media'),
      (v_tpl_id,'producao',6,'Comissionamento elétrico','Energização, testes de I/O, sequência de segurança.','alta'),
      (v_tpl_id,'qualidade',1,'Plano de inspeção','Ensaios, critérios de aceite e responsáveis.','alta'),
      (v_tpl_id,'qualidade',2,'Testes de bancada','Ensaios unitários de subconjuntos antes do FAT.','media'),
      (v_tpl_id,'qualidade',3,'FAT interno','Ensaio de aceitação em fábrica sem cliente.','alta'),
      (v_tpl_id,'qualidade',4,'FAT com cliente','Homologação com testemunho do cliente.','urgente'),
      (v_tpl_id,'qualidade',5,'Certificados e normas aplicáveis','NR-10, NR-12, CE, sanitário.','media'),
      (v_tpl_id,'pos_venda',1,'Manuais as-built entregues','Manuais mecânico, elétrico e operação atualizados.','media'),
      (v_tpl_id,'pos_venda',2,'Treinamento de operadores','Turmas de operação e higienização.','media'),
      (v_tpl_id,'pos_venda',3,'Início da garantia registrado','Data de startup + escopo de cobertura.','alta'),
      (v_tpl_id,'pos_venda',4,'Plano de spare-parts sugerido','Kit de peças críticas recomendado.','baixa');

    -- BOM base
    INSERT INTO public.etapa_template_bom_item (template_id, equipamento_disciplina, disciplina_projeto, descricao, quantidade, unidade, criticidade, ordem) VALUES
      (v_tpl_id,'engenharia','mecanico','Estrutura em aço inox AISI 304',1,'cj','alta',1),
      (v_tpl_id,'engenharia','mecanico','Moto-redutor principal',1,'un','alta',2),
      (v_tpl_id,'engenharia','mecanico','Rolamentos e mancais',4,'un','media',3),
      (v_tpl_id,'engenharia','mecanico','Correias/correntes de transmissão',2,'un','media',4),
      (v_tpl_id,'producao','eletrico','Painel elétrico completo',1,'cj','alta',10),
      (v_tpl_id,'producao','eletrico','CLP + módulos de I/O',1,'cj','alta',11),
      (v_tpl_id,'producao','eletrico','IHM 10"',1,'un','alta',12),
      (v_tpl_id,'producao','eletrico','Inversor de frequência',1,'un','alta',13),
      (v_tpl_id,'producao','eletrico','Cabo elétrico e conectores',1,'cj','media',14),
      (v_tpl_id,'producao','eletrico','Sensores (proximidade/fotoelétrico)',4,'un','media',15);

    -- Snapshot v1
    INSERT INTO public.etapa_template_versao (template_id, versao, snapshot, comentario, actor_nome)
    VALUES (v_tpl_id, 1,
      jsonb_build_object(
        'itens', COALESCE((SELECT jsonb_agg(row_to_json(i)) FROM public.etapa_template_item i WHERE i.template_id = v_tpl_id AND i.deleted_at IS NULL), '[]'::jsonb),
        'bom', COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM public.etapa_template_bom_item b WHERE b.template_id = v_tpl_id AND b.deleted_at IS NULL), '[]'::jsonb)
      ),
      'Seed inicial',
      'sistema');
  END LOOP;
END $seed$;
