-- ============================================================================
-- C1 — Expandir seed_equipamento_disciplinas com BOM elétrico/automação base.
-- Adiciona 5 itens elétricos padrão além dos 3 originais:
--   • Cabeamento estruturado + eletroduto
--   • Disjuntores e proteção
--   • Inversor de frequência
--   • Safety relay + botão de emergência
--   • Sinalização (torre de sinal)
-- Idempotente: substitui a função e faz backfill checando descrição.
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

  -- ETAPAS (idênticas à seed original)
  INSERT INTO public.equipamento_disciplina_etapas (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, created_by) VALUES
    (_eq_id, 'planejamento', 1, 'Kick-off com cliente', 'Reunião de arranque: escopo, cronograma-macro, papéis.', 'alta', v_uid),
    (_eq_id, 'planejamento', 2, 'ETP aprovado pelo cliente', 'Especificação Técnica do Produto revisada e aprovada.', 'alta', v_uid),
    (_eq_id, 'planejamento', 3, 'Layout preliminar aprovado', 'Área ocupada, altura livre, acessos, integração à linha.', 'media', v_uid),
    (_eq_id, 'planejamento', 4, 'Cronograma-macro publicado', 'Marcos até FAT e entrega.', 'media', v_uid),
    (_eq_id, 'planejamento', 5, 'Confirmação de utilidades', 'Elétrica, ar comprimido, água, dreno.', 'media', v_uid),
    (_eq_id, 'engenharia', 1, 'Concepção mecânica', 'Diagrama funcional e princípios de operação.', 'alta', v_uid),
    (_eq_id, 'engenharia', 2, 'Modelagem 3D', 'Modelagem completa em CAD (SolidWorks/Inventor).', 'alta', v_uid),
    (_eq_id, 'engenharia', 3, 'Detalhamento e desenhos 2D', 'Desenhos para fabricação com tolerâncias.', 'media', v_uid),
    (_eq_id, 'engenharia', 4, 'Lista de peças (BOM mecânico)', 'Fechamento do BOM de mecânica e envio para insumos.', 'alta', v_uid),
    (_eq_id, 'engenharia', 5, 'Revisão crítica de projeto', 'Design review antes de liberar produção.', 'media', v_uid),
    (_eq_id, 'engenharia', 6, 'Liberação para produção', 'R00 aprovada, arquivos publicados.', 'alta', v_uid),
    (_eq_id, 'producao', 1, 'Diagrama unifilar e potência instalada', 'Dimensionamento da entrada e distribuição.', 'alta', v_uid),
    (_eq_id, 'producao', 2, 'Dimensionamento do painel elétrico', 'Envelope térmico, IP, componentes principais.', 'alta', v_uid),
    (_eq_id, 'producao', 3, 'Lista de I/O e P&ID elétrico', 'Sensores, atuadores, botoeiras, mapeamento CLP.', 'media', v_uid),
    (_eq_id, 'producao', 4, 'Programação CLP', 'Lógica principal, alarmes, receitas.', 'alta', v_uid),
    (_eq_id, 'producao', 5, 'Programação IHM', 'Telas, permissões, integração com CLP.', 'media', v_uid),
    (_eq_id, 'producao', 6, 'Comissionamento elétrico', 'Energização, testes de I/O, sequência de segurança.', 'alta', v_uid),
    (_eq_id, 'qualidade', 1, 'Plano de inspeção', 'Ensaios, critérios de aceite e responsáveis.', 'alta', v_uid),
    (_eq_id, 'qualidade', 2, 'Testes de bancada', 'Ensaios unitários de subconjuntos antes do FAT.', 'media', v_uid),
    (_eq_id, 'qualidade', 3, 'FAT interno', 'Ensaio de aceitação em fábrica sem cliente.', 'alta', v_uid),
    (_eq_id, 'qualidade', 4, 'FAT com cliente', 'Homologação com testemunho do cliente.', 'urgente', v_uid),
    (_eq_id, 'qualidade', 5, 'Certificados e normas aplicáveis', 'NR-10, NR-12, CE, sanitário.', 'media', v_uid),
    (_eq_id, 'pos_venda', 1, 'Manuais as-built entregues', 'Manuais mecânico, elétrico e operação atualizados.', 'media', v_uid),
    (_eq_id, 'pos_venda', 2, 'Treinamento de operadores', 'Turmas de operação e higienização.', 'media', v_uid),
    (_eq_id, 'pos_venda', 3, 'Início da garantia registrado', 'Data de startup + escopo de cobertura.', 'alta', v_uid),
    (_eq_id, 'pos_venda', 4, 'Plano de spare-parts sugerido', 'Kit de peças críticas recomendado.', 'baixa', v_uid);

  -- Etapas específicas por família
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
  -- BOM SUGERIDO — base ampliada (mecânica + elétrica/automação)
  -- ============================
  INSERT INTO public.projeto_insumos
    (projeto_id, cliente_id, equipamento_id, equipamento_disciplina, disciplina, descricao, quantidade, unidade, criticidade, status, created_by)
  VALUES
    -- Mecânica base
    (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Estrutura em aço inox AISI 304',   1, 'cj',  'alta',   'rascunho', v_uid),
    (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Moto-redutor principal',           1, 'un',  'alta',   'rascunho', v_uid),
    (v_projeto_mecanico_id, v_eq.cliente_id, _eq_id, 'engenharia', 'mecanico', 'Componentes pneumáticos (kit)',    1, 'kit', 'media',  'rascunho', v_uid),
    -- Elétrica / Automação base ampliada
    (v_projeto_eletrico_id, v_eq.cliente_id, _eq_id, 'producao', 'eletrico',  'Painel elétrico dimensionado',              1, 'un',  'alta',    'rascunho', v_uid),
    (v_projeto_eletrico_id, v_eq.cliente_id, _eq_id, 'producao', 'automacao', 'CLP + IHM',                                  1, 'cj',  'alta',    'rascunho', v_uid),
    (v_projeto_eletrico_id, v_eq.cliente_id, _eq_id, 'producao', 'eletrico',  'Sensores e botoeiras (kit)',                 1, 'kit', 'media',   'rascunho', v_uid),
    (v_projeto_eletrico_id, v_eq.cliente_id, _eq_id, 'producao', 'eletrico',  'Cabeamento estruturado + eletrodutos',       1, 'kit', 'media',   'rascunho', v_uid),
    (v_projeto_eletrico_id, v_eq.cliente_id, _eq_id, 'producao', 'eletrico',  'Disjuntores e dispositivos de proteção',     1, 'cj',  'alta',    'rascunho', v_uid),
    (v_projeto_eletrico_id, v_eq.cliente_id, _eq_id, 'producao', 'eletrico',  'Inversor de frequência',                     1, 'un',  'alta',    'rascunho', v_uid),
    (v_projeto_eletrico_id, v_eq.cliente_id, _eq_id, 'producao', 'automacao', 'Safety relay + botão de emergência (NR-12)', 1, 'cj',  'critica', 'rascunho', v_uid),
    (v_projeto_eletrico_id, v_eq.cliente_id, _eq_id, 'producao', 'eletrico',  'Torre de sinalização luminosa',              1, 'un',  'baixa',   'rascunho', v_uid);

  -- BOM específico por família (idêntico)
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

-- ============================================================================
-- Backfill: para equipamentos existentes, adiciona os 5 novos itens elétricos
-- se ainda não existirem (comparando pela descrição).
-- ============================================================================
DO $$
DECLARE
  r RECORD;
  v_projeto_eletrico_id uuid;
  v_new_items text[] := ARRAY[
    'Cabeamento estruturado + eletrodutos',
    'Disjuntores e dispositivos de proteção',
    'Inversor de frequência',
    'Safety relay + botão de emergência (NR-12)',
    'Torre de sinalização luminosa'
  ];
  v_new_disc text[] := ARRAY['eletrico', 'eletrico', 'eletrico', 'automacao', 'eletrico'];
  v_new_unid text[] := ARRAY['kit', 'cj', 'un', 'cj', 'un'];
  v_new_crit text[] := ARRAY['media', 'alta', 'alta', 'critica', 'baixa'];
  i int;
BEGIN
  FOR r IN
    SELECT DISTINCT ce.id AS equipamento_id, ce.cliente_id
    FROM public.cliente_equipamentos ce
    WHERE ce.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.equipamento_disciplina_etapas d
        WHERE d.equipamento_id = ce.id AND d.deleted_at IS NULL
      )
  LOOP
    SELECT id INTO v_projeto_eletrico_id
      FROM public.equipamento_projetos
      WHERE equipamento_id = r.equipamento_id
        AND disciplina = 'eletrico'::public.projeto_disciplina
        AND revisao = 'R00'
        AND deleted_at IS NULL
      LIMIT 1;
    IF v_projeto_eletrico_id IS NULL THEN CONTINUE; END IF;

    FOR i IN 1..array_length(v_new_items, 1) LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.projeto_insumos
        WHERE equipamento_id = r.equipamento_id
          AND descricao = v_new_items[i]
          AND deleted_at IS NULL
      ) THEN
        INSERT INTO public.projeto_insumos
          (projeto_id, cliente_id, equipamento_id, equipamento_disciplina, disciplina, descricao, quantidade, unidade, criticidade, status)
        VALUES
          (v_projeto_eletrico_id, r.cliente_id, r.equipamento_id, 'producao', v_new_disc[i], v_new_items[i], 1, v_new_unid[i], v_new_crit[i]::public.insumo_criticidade, 'rascunho');
      END IF;
    END LOOP;
  END LOOP;
END $$;
