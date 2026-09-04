-- ============================================================================
-- Etapas por disciplina (dentro do modal do equipamento) + BOM vinculado.
-- Cria as tabelas equipamento_disciplina_etapas e equipamento_etapa_comentarios,
-- estende projeto_insumos com equipamento_id + equipamento_disciplina,
-- e provê uma função de seed idempotente + trigger no INSERT do equipamento.
-- ============================================================================

-- 1) BOM: liga insumo direto a um equipamento e à disciplina/aba de origem.
ALTER TYPE public.insumo_status ADD VALUE IF NOT EXISTS 'pronto_aprovacao' BEFORE 'aprovado';

ALTER TABLE public.projeto_insumos
  ADD COLUMN IF NOT EXISTS equipamento_id uuid REFERENCES public.cliente_equipamentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS equipamento_disciplina text;

CREATE INDEX IF NOT EXISTS idx_projeto_insumos_equipamento
  ON public.projeto_insumos(equipamento_id) WHERE equipamento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projeto_insumos_equipamento_disciplina
  ON public.projeto_insumos(equipamento_id, equipamento_disciplina)
  WHERE equipamento_id IS NOT NULL;

-- 2) Etapas por disciplina.
CREATE TABLE IF NOT EXISTS public.equipamento_disciplina_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.cliente_equipamentos(id) ON DELETE CASCADE,
  disciplina text NOT NULL CHECK (disciplina IN ('planejamento','engenharia','producao','qualidade','pos_venda')),
  parent_id uuid REFERENCES public.equipamento_disciplina_etapas(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 0,
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'nao_iniciado'
    CHECK (status IN ('nao_iniciado','em_progresso','bloqueado','concluido')),
  prioridade text NOT NULL DEFAULT 'media'
    CHECK (prioridade IN ('baixa','media','alta','urgente')),
  progresso int NOT NULL DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  data_vencimento date,
  responsavel_id uuid,
  responsavel_nome text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_disc_etapas_equipamento
  ON public.equipamento_disciplina_etapas(equipamento_id, disciplina)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_disc_etapas_parent
  ON public.equipamento_disciplina_etapas(parent_id) WHERE parent_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_disciplina_etapas TO authenticated;
GRANT ALL ON public.equipamento_disciplina_etapas TO service_role;
ALTER TABLE public.equipamento_disciplina_etapas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "disc etapas leitura autenticada" ON public.equipamento_disciplina_etapas;
CREATE POLICY "disc etapas leitura autenticada" ON public.equipamento_disciplina_etapas
  FOR SELECT TO authenticated USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.cliente_equipamentos ce
      WHERE ce.id = equipamento_disciplina_etapas.equipamento_id
        AND ce.deleted_at IS NULL
        AND public.can_access_cliente(ce.cliente_id)
    )
  );

DROP POLICY IF EXISTS "disc etapas insert" ON public.equipamento_disciplina_etapas;
CREATE POLICY "disc etapas insert" ON public.equipamento_disciplina_etapas
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cliente_equipamentos ce
      WHERE ce.id = equipamento_disciplina_etapas.equipamento_id
        AND ce.deleted_at IS NULL
        AND public.can_access_cliente(ce.cliente_id)
    )
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR created_by = auth.uid()
    )
  );

-- Update: admin/manager sempre; responsável pode atualizar sua própria etapa.
DROP POLICY IF EXISTS "disc etapas update" ON public.equipamento_disciplina_etapas;
CREATE POLICY "disc etapas update" ON public.equipamento_disciplina_etapas
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cliente_equipamentos ce
      WHERE ce.id = equipamento_disciplina_etapas.equipamento_id
        AND ce.deleted_at IS NULL
        AND public.can_access_cliente(ce.cliente_id)
    )
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR responsavel_id = auth.uid()
      OR created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cliente_equipamentos ce
      WHERE ce.id = equipamento_disciplina_etapas.equipamento_id
        AND ce.deleted_at IS NULL
        AND public.can_access_cliente(ce.cliente_id)
    )
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR responsavel_id = auth.uid()
      OR created_by = auth.uid()
    )
  );

-- Delete: apenas admin/manager (soft delete via update também bloqueado a não-donos).
DROP POLICY IF EXISTS "disc etapas delete" ON public.equipamento_disciplina_etapas;
CREATE POLICY "disc etapas delete" ON public.equipamento_disciplina_etapas
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cliente_equipamentos ce
      WHERE ce.id = equipamento_disciplina_etapas.equipamento_id
        AND ce.deleted_at IS NULL
        AND public.can_access_cliente(ce.cliente_id)
    )
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
    )
  );

-- 3) Comentários na thread da etapa.
CREATE TABLE IF NOT EXISTS public.equipamento_etapa_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id uuid NOT NULL REFERENCES public.equipamento_disciplina_etapas(id) ON DELETE CASCADE,
  autor_id uuid,
  autor_nome text,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_etapa_coment_etapa ON public.equipamento_etapa_comentarios(etapa_id);
GRANT SELECT, INSERT, DELETE ON public.equipamento_etapa_comentarios TO authenticated;
GRANT ALL ON public.equipamento_etapa_comentarios TO service_role;
ALTER TABLE public.equipamento_etapa_comentarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "etapa coment leitura autenticada" ON public.equipamento_etapa_comentarios;
CREATE POLICY "etapa coment leitura autenticada" ON public.equipamento_etapa_comentarios
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.equipamento_disciplina_etapas e
      JOIN public.cliente_equipamentos ce ON ce.id = e.equipamento_id
      WHERE e.id = equipamento_etapa_comentarios.etapa_id
        AND e.deleted_at IS NULL
        AND ce.deleted_at IS NULL
        AND public.can_access_cliente(ce.cliente_id)
    )
  );
DROP POLICY IF EXISTS "etapa coment insert autenticado" ON public.equipamento_etapa_comentarios;
CREATE POLICY "etapa coment insert autenticado" ON public.equipamento_etapa_comentarios
  FOR INSERT TO authenticated WITH CHECK (
    autor_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.equipamento_disciplina_etapas e
      JOIN public.cliente_equipamentos ce ON ce.id = e.equipamento_id
      WHERE e.id = equipamento_etapa_comentarios.etapa_id
        AND e.deleted_at IS NULL
        AND ce.deleted_at IS NULL
        AND public.can_access_cliente(ce.cliente_id)
    )
  );
DROP POLICY IF EXISTS "etapa coment delete autor/manager" ON public.equipamento_etapa_comentarios;
CREATE POLICY "etapa coment delete autor/manager" ON public.equipamento_etapa_comentarios
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.equipamento_disciplina_etapas e
      JOIN public.cliente_equipamentos ce ON ce.id = e.equipamento_id
      WHERE e.id = equipamento_etapa_comentarios.etapa_id
        AND e.deleted_at IS NULL
        AND ce.deleted_at IS NULL
        AND public.can_access_cliente(ce.cliente_id)
    )
    AND (
      autor_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
    )
  );

-- Trigger touch updated_at
CREATE OR REPLACE FUNCTION public.tg_disc_etapas_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  IF NEW.status = 'concluido' AND NEW.progresso < 100 THEN
    NEW.progresso := 100;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_disc_etapas_touch ON public.equipamento_disciplina_etapas;
CREATE TRIGGER trg_disc_etapas_touch
BEFORE UPDATE ON public.equipamento_disciplina_etapas
FOR EACH ROW EXECUTE FUNCTION public.tg_disc_etapas_touch();

-- ============================================================================
-- 4) Seed function: dado um equipamento_id, popula etapas base + BOM sugerido.
--    Idempotente: se já houver etapas para o equipamento, não faz nada.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.seed_equipamento_disciplinas(_eq_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eq RECORD;
  v_familia text;
  v_slug text;
  v_modelo text;
  v_uid uuid := auth.uid();
  v_existing int;
  v_projeto_mecanico_id uuid;
  v_projeto_eletrico_id uuid;
BEGIN
  SELECT id, planejamento_template_slug, modelo, categoria, cliente_id, oportunidade_id
    INTO v_eq
    FROM public.cliente_equipamentos WHERE id = _eq_id;
  IF v_eq IS NULL THEN RETURN; END IF;

  SELECT count(*) INTO v_existing
    FROM public.equipamento_disciplina_etapas
    WHERE equipamento_id = _eq_id AND deleted_at IS NULL;
  IF v_existing > 0 THEN RETURN; END IF;

  v_slug := lower(coalesce(v_eq.planejamento_template_slug, ''));
  v_modelo := lower(coalesce(v_eq.modelo, ''));

  -- Deriva família a partir do template ou nome do modelo.
  SELECT lower(t.familia::text) INTO v_familia
    FROM public.equipamento_planejamento_templates t
    WHERE t.slug = v_slug LIMIT 1;
  IF v_familia IS NULL OR v_familia = '' THEN
    v_familia := CASE
      WHEN v_modelo ~ 'envas|dosad|linha de envase|filler' THEN 'empacotamento'
      WHEN v_modelo ~ 'rotul|etiquet|label' THEN 'rotulagem'
      WHEN v_modelo ~ 'palet' THEN 'paletizacao'
      WHEN v_modelo ~ 'big.?bag' THEN 'empacotamento'
      WHEN v_modelo ~ 'check.?peso|inspe|detector' THEN 'inspecao'
      WHEN v_modelo ~ 'codific|inkjet|hotstamp' THEN 'codificacao'
      WHEN v_modelo ~ 'sache|pouch|termo|encart|encaix|sacheteir|empacot' THEN 'empacotamento'
      WHEN v_modelo ~ 'transporte|esteira|rolete' THEN 'transporte'
      ELSE 'geral'
    END;
  END IF;

  -- A tabela projeto_insumos exige projeto_id. Para BOM nas abas do EQP,
  -- reutilizamos/criamos os projetos R00 mecânico e elétrico do equipamento.
  INSERT INTO public.equipamento_projetos
    (equipamento_id, cliente_id, disciplina, revisao, status, created_by)
  VALUES
    (_eq_id, v_eq.cliente_id, 'mecanico'::public.projeto_disciplina, 'R00', 'em_elaboracao'::public.projeto_status, v_uid)
  ON CONFLICT (equipamento_id, disciplina, revisao)
  DO UPDATE SET deleted_at = NULL, cliente_id = EXCLUDED.cliente_id
  RETURNING id INTO v_projeto_mecanico_id;

  INSERT INTO public.equipamento_projetos
    (equipamento_id, cliente_id, disciplina, revisao, status, created_by)
  VALUES
    (_eq_id, v_eq.cliente_id, 'eletrico'::public.projeto_disciplina, 'R00', 'em_elaboracao'::public.projeto_status, v_uid)
  ON CONFLICT (equipamento_id, disciplina, revisao)
  DO UPDATE SET deleted_at = NULL, cliente_id = EXCLUDED.cliente_id
  RETURNING id INTO v_projeto_eletrico_id;

  -- ============================
  -- PLANEJAMENTO (kickoff/comercial) — 5 etapas
  -- ============================
  INSERT INTO public.equipamento_disciplina_etapas
    (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by)
  VALUES
    (_eq_id, 'planejamento', 1, 'Kick-off com cliente', 'Reunião de arranque: escopo, cronograma-macro, papéis.', 'alta', v_uid),
    (_eq_id, 'planejamento', 2, 'ETP aprovado pelo cliente', 'Especificação Técnica do Produto revisada e aprovada.', 'alta', v_uid),
    (_eq_id, 'planejamento', 3, 'Layout preliminar aprovado', 'Área ocupada, altura livre, acessos, integração à linha.', 'media', v_uid),
    (_eq_id, 'planejamento', 4, 'Cronograma-macro publicado', 'Marcos até FAT e entrega.', 'media', v_uid),
    (_eq_id, 'planejamento', 5, 'Confirmação de utilidades', 'Elétrica, ar comprimido, água, dreno.', 'media', v_uid);

  -- ============================
  -- ENGENHARIA MECÂNICA — 6 etapas
  -- ============================
  INSERT INTO public.equipamento_disciplina_etapas
    (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by)
  VALUES
    (_eq_id, 'engenharia', 1, 'Concepção mecânica', 'Diagrama funcional e princípios de operação.', 'alta', v_uid),
    (_eq_id, 'engenharia', 2, 'Modelagem 3D', 'Modelagem completa em CAD (SolidWorks/Inventor).', 'alta', v_uid),
    (_eq_id, 'engenharia', 3, 'Detalhamento e desenhos 2D', 'Desenhos para fabricação com tolerâncias.', 'media', v_uid),
    (_eq_id, 'engenharia', 4, 'Lista de peças (BOM mecânico)', 'Fechamento do BOM de mecânica e envio para insumos.', 'alta', v_uid),
    (_eq_id, 'engenharia', 5, 'Revisão crítica de projeto', 'Design review antes de liberar produção.', 'media', v_uid),
    (_eq_id, 'engenharia', 6, 'Liberação para produção', 'R00 aprovada, arquivos publicados.', 'alta', v_uid);

  -- ============================
  -- AUTOMAÇÃO (elétrica + CLP) — 6 etapas
  -- ============================
  INSERT INTO public.equipamento_disciplina_etapas
    (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by)
  VALUES
    (_eq_id, 'producao', 1, 'Diagrama unifilar e potência instalada', 'Dimensionamento da entrada e distribuição.', 'alta', v_uid),
    (_eq_id, 'producao', 2, 'Dimensionamento do painel elétrico', 'Envelope térmico, IP, componentes principais.', 'alta', v_uid),
    (_eq_id, 'producao', 3, 'Lista de I/O e P&ID elétrico', 'Sensores, atuadores, botoeiras, mapeamento CLP.', 'media', v_uid),
    (_eq_id, 'producao', 4, 'Programação CLP', 'Lógica principal, alarmes, receitas.', 'alta', v_uid),
    (_eq_id, 'producao', 5, 'Programação IHM', 'Telas, permissões, integração com CLP.', 'media', v_uid),
    (_eq_id, 'producao', 6, 'Comissionamento elétrico', 'Energização, testes de I/O, sequência de segurança.', 'alta', v_uid);

  -- ============================
  -- QUALIDADE — 5 etapas
  -- ============================
  INSERT INTO public.equipamento_disciplina_etapas
    (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by)
  VALUES
    (_eq_id, 'qualidade', 1, 'Plano de inspeção', 'Ensaios, critérios de aceite e responsáveis.', 'alta', v_uid),
    (_eq_id, 'qualidade', 2, 'Testes de bancada', 'Ensaios unitários de subconjuntos antes do FAT.', 'media', v_uid),
    (_eq_id, 'qualidade', 3, 'FAT interno', 'Ensaio de aceitação em fábrica sem cliente.', 'alta', v_uid),
    (_eq_id, 'qualidade', 4, 'FAT com cliente', 'Homologação com testemunho do cliente.', 'urgente', v_uid),
    (_eq_id, 'qualidade', 5, 'Certificados e normas aplicáveis', 'NR-10, NR-12, CE, sanitário.', 'media', v_uid);

  -- ============================
  -- PÓS-VENDA — 4 etapas
  -- ============================
  INSERT INTO public.equipamento_disciplina_etapas
    (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by)
  VALUES
    (_eq_id, 'pos_venda', 1, 'Manuais as-built entregues', 'Manuais mecânico, elétrico e operação atualizados.', 'media', v_uid),
    (_eq_id, 'pos_venda', 2, 'Treinamento de operadores', 'Turmas de operação e higienização.', 'media', v_uid),
    (_eq_id, 'pos_venda', 3, 'Início da garantia registrado', 'Data de startup + escopo de cobertura.', 'alta', v_uid),
    (_eq_id, 'pos_venda', 4, 'Plano de spare-parts sugerido', 'Kit de peças críticas recomendado.', 'baixa', v_uid);

  -- ============================
  -- ETAPAS ESPECÍFICAS POR FAMÍLIA
  -- ============================
  IF v_familia IN ('empacotamento') AND v_modelo ~ 'envas|filler|linha de envase|dosad' THEN
    INSERT INTO public.equipamento_disciplina_etapas (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by) VALUES
      (_eq_id, 'engenharia', 20, 'Definir bicos/dosadores', 'Viscosidade, precisão de dose, CIP.', 'alta', v_uid),
      (_eq_id, 'qualidade', 20, 'Ensaios de vazão e dosagem', 'Repetibilidade e desvio-padrão de envase.', 'alta', v_uid);
  ELSIF v_modelo ~ 'sache' THEN
    INSERT INTO public.equipamento_disciplina_etapas (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by) VALUES
      (_eq_id, 'engenharia', 20, 'Definir formato do sachê e barras de solda', NULL, 'alta', v_uid),
      (_eq_id, 'qualidade', 20, 'Ensaio de estanqueidade', 'Testes de vazamento na solda.', 'alta', v_uid);
  ELSIF v_familia = 'rotulagem' THEN
    INSERT INTO public.equipamento_disciplina_etapas (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by) VALUES
      (_eq_id, 'engenharia', 20, 'Definir cabeçote (auto-adesivo / cola quente)', NULL, 'alta', v_uid),
      (_eq_id, 'producao', 20, 'Programação de posição do rótulo', 'Sensor de garrafa + encoder.', 'media', v_uid);
  ELSIF v_familia = 'paletizacao' OR v_modelo ~ 'palet|robo' THEN
    INSERT INTO public.equipamento_disciplina_etapas (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by) VALUES
      (_eq_id, 'engenharia', 20, 'Layout de camadas do pallet', NULL, 'alta', v_uid),
      (_eq_id, 'producao', 20, 'Programação robótica (trajetória, garra)', NULL, 'alta', v_uid),
      (_eq_id, 'qualidade', 20, 'Ensaio de estabilidade do pallet', NULL, 'media', v_uid);
  ELSIF v_familia = 'inspecao' OR v_modelo ~ 'check.?peso|detector metais|selecionadora' THEN
    INSERT INTO public.equipamento_disciplina_etapas (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by) VALUES
      (_eq_id, 'qualidade', 20, 'Calibração metrológica', 'Verificação com massas-padrão certificadas.', 'urgente', v_uid),
      (_eq_id, 'qualidade', 21, 'Ensaio de rejeição', 'Verificação da lógica de expulsão.', 'alta', v_uid);
  ELSIF v_modelo ~ 'big.?bag' THEN
    INSERT INTO public.equipamento_disciplina_etapas (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by) VALUES
      (_eq_id, 'engenharia', 20, 'Sistema anti-abobadamento + aspiração', NULL, 'alta', v_uid),
      (_eq_id, 'engenharia', 21, 'Estrutura de içamento e talha', NULL, 'alta', v_uid);
  ELSIF v_familia = 'codificacao' OR v_modelo ~ 'codific|inkjet|hotstamp' THEN
    INSERT INTO public.equipamento_disciplina_etapas (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by) VALUES
      (_eq_id, 'producao', 20, 'Integração com sistema de código (BD/produção)', NULL, 'alta', v_uid),
      (_eq_id, 'qualidade', 20, 'Verificação de legibilidade e leitura de código', NULL, 'alta', v_uid);
  ELSIF v_modelo ~ 'transporte|esteira|rolete|transportador' THEN
    INSERT INTO public.equipamento_disciplina_etapas (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by) VALUES
      (_eq_id, 'engenharia', 20, 'Definir tipo (esteira/rolete/aéreo) e velocidade', NULL, 'alta', v_uid);
  ELSIF v_modelo ~ 'encaix|encart|enfard' THEN
    INSERT INTO public.equipamento_disciplina_etapas (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by) VALUES
      (_eq_id, 'producao', 20, 'Programação de formação da caixa/fardo', NULL, 'alta', v_uid),
      (_eq_id, 'engenharia', 20, 'Definir aplicação de cola/fita', NULL, 'media', v_uid);
  END IF;

  -- ============================
  -- BOM SUGERIDO (projeto_insumos) — só itens base, manager amplia depois.
  -- ============================
  INSERT INTO public.projeto_insumos
    (projeto_id, cliente_id, equipamento_id, equipamento_disciplina, disciplina, descricao, quantidade, unidade, criticidade, status, created_by)
  VALUES
    -- Mecânica base
    (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Estrutura em aço inox AISI 304', 1, 'cj',  'alta',   'rascunho', v_uid),
    (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Moto-redutor principal',            1, 'un',  'alta',   'rascunho', v_uid),
    (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Componentes pneumáticos (kit)',     1, 'kit', 'media',  'rascunho', v_uid),
    -- Elétrica / Automação base
    (v_projeto_eletrico_id, v_eq.cliente_id, _eq_id, 'producao',   'eletrico', 'Painel elétrico dimensionado',      1, 'un',  'alta',   'rascunho', v_uid),
    (v_projeto_eletrico_id, v_eq.cliente_id, _eq_id, 'producao',   'automacao','CLP + IHM',                          1, 'cj',  'alta',   'rascunho', v_uid),
    (v_projeto_eletrico_id, v_eq.cliente_id, _eq_id, 'producao',   'eletrico', 'Sensores e botoeiras (kit)',         1, 'kit', 'media',  'rascunho', v_uid);

  -- Itens BOM específicos por família
  IF v_familia = 'empacotamento' AND v_modelo ~ 'envas|filler|dosad' THEN
    INSERT INTO public.projeto_insumos (projeto_id, cliente_id, equipamento_id, equipamento_disciplina, disciplina, descricao, quantidade, unidade, criticidade, status, created_by) VALUES
      (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Bicos dosadores sanitários (inox 316L)', 1, 'cj', 'critica', 'rascunho', v_uid),
      (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Bomba de deslocamento positivo', 1, 'un', 'alta', 'rascunho', v_uid);
  ELSIF v_familia = 'rotulagem' THEN
    INSERT INTO public.projeto_insumos (projeto_id, cliente_id, equipamento_id, equipamento_disciplina, disciplina, descricao, quantidade, unidade, criticidade, status, created_by) VALUES
      (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Cabeçote rotulador auto-adesivo', 1, 'un', 'critica', 'rascunho', v_uid),
      (v_projeto_eletrico_id, v_eq.cliente_id, _eq_id, 'producao', 'eletrico', 'Encoder de posição', 1, 'un', 'alta', 'rascunho', v_uid);
  ELSIF v_familia = 'paletizacao' OR v_modelo ~ 'palet|robo' THEN
    INSERT INTO public.projeto_insumos (projeto_id, cliente_id, equipamento_id, equipamento_disciplina, disciplina, descricao, quantidade, unidade, criticidade, status, created_by) VALUES
      (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Robô paletizador', 1, 'un', 'critica', 'rascunho', v_uid),
      (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Garra (end-of-arm tooling)', 1, 'un', 'alta', 'rascunho', v_uid),
      (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Cerca de segurança + scanner de área', 1, 'cj', 'alta', 'rascunho', v_uid);
  ELSIF v_familia = 'inspecao' OR v_modelo ~ 'check.?peso' THEN
    INSERT INTO public.projeto_insumos (projeto_id, cliente_id, equipamento_id, equipamento_disciplina, disciplina, descricao, quantidade, unidade, criticidade, status, created_by) VALUES
      (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Célula de carga de precisão', 1, 'un', 'critica', 'rascunho', v_uid),
      (v_projeto_eletrico_id, v_eq.cliente_id, _eq_id, 'producao', 'eletrico', 'Controlador metrológico homologado', 1, 'un', 'critica', 'rascunho', v_uid);
  ELSIF v_modelo ~ 'big.?bag' THEN
    INSERT INTO public.projeto_insumos (projeto_id, cliente_id, equipamento_id, equipamento_disciplina, disciplina, descricao, quantidade, unidade, criticidade, status, created_by) VALUES
      (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Talha elétrica de içamento', 1, 'un', 'alta', 'rascunho', v_uid),
      (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Filtro de mangas', 1, 'un', 'alta', 'rascunho', v_uid);
  ELSIF v_familia = 'codificacao' THEN
    INSERT INTO public.projeto_insumos (projeto_id, cliente_id, equipamento_id, equipamento_disciplina, disciplina, descricao, quantidade, unidade, criticidade, status, created_by) VALUES
      (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Cabeçote de impressão (Inkjet/TTO)', 1, 'un', 'critica', 'rascunho', v_uid);
  ELSIF v_modelo ~ 'transport|esteira' THEN
    INSERT INTO public.projeto_insumos (projeto_id, cliente_id, equipamento_id, equipamento_disciplina, disciplina, descricao, quantidade, unidade, criticidade, status, created_by) VALUES
      (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Correia transportadora (m)', 10, 'm', 'alta', 'rascunho', v_uid),
      (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Motoredutor SEW/Nord', 1, 'un', 'alta', 'rascunho', v_uid);
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.seed_equipamento_disciplinas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_equipamento_disciplinas(uuid) TO service_role;

-- 5) Trigger que faz o seed automaticamente ao criar um equipamento.
CREATE OR REPLACE FUNCTION public.tg_cliente_equipamentos_seed_disc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_equipamento_disciplinas(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_cliente_equipamentos_seed_disc ON public.cliente_equipamentos;
CREATE TRIGGER trg_cliente_equipamentos_seed_disc
AFTER INSERT ON public.cliente_equipamentos
FOR EACH ROW EXECUTE FUNCTION public.tg_cliente_equipamentos_seed_disc();

-- 6) Backfill: gerar etapas nos equipamentos existentes que ainda não têm.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.cliente_equipamentos
    WHERE deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.equipamento_disciplina_etapas d
        WHERE d.equipamento_id = cliente_equipamentos.id AND d.deleted_at IS NULL
      )
  LOOP
    PERFORM public.seed_equipamento_disciplinas(r.id);
  END LOOP;
END $$;
