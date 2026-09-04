-- ============================================================================
-- Seed: Projeto demo "Envasadora Linear 1014" — ciclo completo de engenharia
-- Idempotente: usa código único DEMO-ENV-1014.
-- ============================================================================

DO $$
DECLARE
  v_cli_id uuid;
  v_eq_id uuid;
  v_proj_mec uuid;
  v_proj_ele uuid;
  v_admin_id uuid;
BEGIN
  SELECT p.id INTO v_admin_id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
   WHERE ur.role IN ('admin','manager') LIMIT 1;

  -- 1) Cliente demo
  SELECT id INTO v_cli_id FROM public.clientes WHERE codigo = 'DEMO-ENV-1014';
  IF v_cli_id IS NULL THEN
    INSERT INTO public.clientes (codigo, razao_social, pais, documento_fiscal_tipo, documento_fiscal_numero, moeda)
    VALUES ('DEMO-ENV-1014','Envasadora Linear 1014 — Projeto Interno','BR','CNPJ','00.000.000/0001-00','BRL')
    RETURNING id INTO v_cli_id;
  END IF;

  -- 2) Equipamento
  SELECT id INTO v_eq_id FROM public.cliente_equipamentos
   WHERE cliente_id = v_cli_id AND codigo = 'ENV-1014' AND deleted_at IS NULL LIMIT 1;
  IF v_eq_id IS NULL THEN
    INSERT INTO public.cliente_equipamentos (cliente_id, codigo, modelo, status, categoria, planejamento_template_slug)
    VALUES (v_cli_id, 'ENV-1014', 'Envasadora Linear 1014', 'planejamento', 'envase', 'envasadora_linear')
    RETURNING id INTO v_eq_id;
  END IF;

  -- 3) Importa template publicado
  BEGIN
    PERFORM public.import_etapas_do_template(v_eq_id, 'envasadora_linear');
  EXCEPTION WHEN OTHERS THEN
    BEGIN PERFORM public.seed_equipamento_disciplinas(v_eq_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  END;

  -- 4) Projetos R00
  SELECT id INTO v_proj_mec FROM public.equipamento_projetos
    WHERE equipamento_id = v_eq_id AND disciplina = 'mecanico' AND deleted_at IS NULL LIMIT 1;
  IF v_proj_mec IS NULL THEN
    INSERT INTO public.equipamento_projetos (equipamento_id, cliente_id, disciplina, revisao)
    VALUES (v_eq_id, v_cli_id, 'mecanico', 'R00') RETURNING id INTO v_proj_mec;
  END IF;
  SELECT id INTO v_proj_ele FROM public.equipamento_projetos
    WHERE equipamento_id = v_eq_id AND disciplina = 'eletrico' AND deleted_at IS NULL LIMIT 1;
  IF v_proj_ele IS NULL THEN
    INSERT INTO public.equipamento_projetos (equipamento_id, cliente_id, disciplina, revisao)
    VALUES (v_eq_id, v_cli_id, 'eletrico', 'R00') RETURNING id INTO v_proj_ele;
  END IF;

  -- 5) Etapas ricas do ciclo
  INSERT INTO public.equipamento_disciplina_etapas
    (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, status, progresso, created_by)
  SELECT v_eq_id, x.disciplina, x.ordem, x.titulo, x.descricao, x.prioridade, x.status, x.progresso, v_admin_id
  FROM (VALUES
    ('planejamento', 100, 'Kick-off técnico com sponsor', 'Alinhar escopo funcional, throughput alvo (60 fpm), envelope (2400×1200×2200 mm), interfaces de linha (entrada de vidro Ø65mm, saída para rotuladora Vega).', 'alta', 'concluido', 100),
    ('planejamento', 101, 'URS + cronograma macro (16 semanas)', 'URS aprovada pelo cliente, Gantt com marcos: FAT S12, embarque S14, comissionamento S16.', 'alta', 'concluido', 100),
    ('planejamento', 102, 'Análise preliminar de risco (APR)', 'FMEA de projeto: mecânica, elétrica, higiene sanitária (CIP) e segurança (categoria PLd conforme ISO 13849).', 'urgente', 'em_progresso', 60),
    ('planejamento', 103, 'Freeze de escopo — baseline técnica', 'Congelar layout, throughput, materiais em contato (AISI 316L polido Ra≤0,8µm) e automação (Rockwell CompactLogix + PanelView 12").', 'alta', 'em_progresso', 30),
    ('engenharia', 200, 'Layout geral 3D — Envelope + BOP', 'SolidWorks: bancada 304, transportador de entrada, 6 bicos servo-atuados, saída tampadora inline. Interferências ok com envelope do cliente.', 'alta', 'em_progresso', 45),
    ('engenharia', 201, 'Transportador de entrada — esteira modular', 'Cadeia Rexnord LF882-K450, guia lateral ajustável, drive 0.55kW SEW, 5–25 m/min. Sick WL9 no gargalo.', 'media', 'em_progresso', 25),
    ('engenharia', 202, 'Estação de 6 bicos de envase', 'Bicos fundo submerso Ø10mm, curso 120mm por servo Rockwell MPL-B330P, válvula sanitária SPX APV. Vazão 0.5–1.0 L @ ±0.3%.', 'urgente', 'em_progresso', 20),
    ('engenharia', 203, 'Sistema de nivelamento inline', 'Célula Mettler IND570 acima do transportador. Malha fechada ajusta tempo de bico. Precisão ±1g.', 'alta', 'nao_iniciado', 0),
    ('engenharia', 204, 'Cabeçote de rosca — Alcoa 28mm', 'Torque servo 1.2–3.0 N·m, capa magnética, sensor Ifm OGH. Rejeito automático de rosca falha.', 'alta', 'nao_iniciado', 0),
    ('engenharia', 205, 'Quadro estrutural + FEA pórtico', 'Tubular 60×60×3mm 304. FEA com carga dinâmica (8 m/s²) — deflexão <0.5mm.', 'media', 'nao_iniciado', 0),
    ('engenharia', 206, 'Data Book mecânico', 'Desenhos R00, BOM, certificados 316L, declaração FDA 21 CFR.', 'baixa', 'nao_iniciado', 0),
    ('producao', 300, 'Diagrama unifilar + dimensionamento', '380V/60Hz 3F, geral 63A, disjuntor por servo. Aterramento equipotencial dedicado.', 'alta', 'em_progresso', 40),
    ('producao', 301, 'Painel elétrico principal — EPLAN', 'Rittal AE 1000×800×300 IP54. CompactLogix 5380 + 8 slots I/O + PowerFlex 525.', 'alta', 'em_progresso', 30),
    ('producao', 302, 'IHM + receitas de produto', 'PanelView Plus 12" com FactoryTalk. ≥50 receitas (volume, torque, tempo, oferta de tampa).', 'media', 'nao_iniciado', 0),
    ('producao', 303, 'Servo-drives (6 eixos) — comissionamento', 'Kinetix 5300 + MPL-B330P. Auto-tune, sincronismo virtual axis para dosagem simultânea.', 'alta', 'nao_iniciado', 0),
    ('producao', 304, 'Sensores de nível + integração balança', 'Ifm KI5083 no pulmão. Mettler IND570 via Ethernet/IP com CLP.', 'media', 'nao_iniciado', 0),
    ('producao', 305, 'Segurança — categoria PLd', 'Sick i10-Lock nas portas, C4000 na saída, 4 botoeiras E-stop, relé UE410-MU. Cálculo ISO 13849.', 'urgente', 'nao_iniciado', 0),
    ('qualidade', 400, 'FAT — hidráulico + repetibilidade', '500 ciclos com água a 20°C, CV≤0.3% por bico. Relatório com histograma.', 'alta', 'nao_iniciado', 0),
    ('qualidade', 401, 'FAT — teste lógico completo', 'Checklist I/O, alarmes, receitas, mudança de formato, integração balança. Assinatura conjunta.', 'alta', 'nao_iniciado', 0),
    ('qualidade', 402, 'Dossiê CE + declaração de incorporação', 'Riscos, cálculo PLr, esquemas, manual do integrador. Marcação CE.', 'media', 'nao_iniciado', 0),
    ('pos_venda', 500, 'SAT no cliente — comissionamento assistido', '2 técnicos x 5 dias. Setup dos 6 bicos, calibração balança, torque. Meta OEE ≥ 85% D5.', 'alta', 'nao_iniciado', 0),
    ('pos_venda', 501, 'Treinamento operador + manutenção', '4h operacional (3 turnos) + 8h preventiva (vedações, lubrificação, calibração).', 'media', 'nao_iniciado', 0),
    ('pos_venda', 502, 'Manual PT/ES/EN + vídeo de operação', 'A4 ilustrado bilíngue. Vídeo 15min por procedimento crítico.', 'baixa', 'nao_iniciado', 0)
  ) AS x(disciplina, ordem, titulo, descricao, prioridade, status, progresso)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.equipamento_disciplina_etapas
     WHERE equipamento_id = v_eq_id AND titulo = x.titulo AND deleted_at IS NULL
  );

  -- 6) BOM rico
  INSERT INTO public.projeto_insumos
    (projeto_id, equipamento_id, equipamento_disciplina, disciplina, descricao, sub_conjunto,
     quantidade, unidade, criticidade, custo_estimado_unit, status, created_by)
  SELECT
    CASE x.disc_proj WHEN 'eletrico' THEN v_proj_ele ELSE v_proj_mec END,
    v_eq_id, x.disc_eq, x.disc_proj, x.descricao, x.sub_conjunto,
    x.qtd, x.un, x.criticidade::public.insumo_criticidade, x.custo, x.status::public.insumo_status, v_admin_id
  FROM (VALUES
    ('mecanico','mecanico','Tubo estrutural 316L Ø60×60×3mm — barras 6m para pórtico e mesa', 'Estrutura', 12, 'un', 'alta', 480.00, 'rascunho'),
    ('mecanico','mecanico','Chapa 316L 3mm 2500×1250mm — laterais fechamento', 'Estrutura', 4, 'un', 'media', 1200.00, 'rascunho'),
    ('mecanico','mecanico','Pé regulável inox M20 com base antivibração', 'Estrutura', 6, 'un', 'baixa', 85.00, 'rascunho'),
    ('mecanico','mecanico','Solda TIG + polimento sanitário Ra≤0.8µm (H·h de serviço)', 'Estrutura', 40, 'h', 'alta', 180.00, 'rascunho'),
    ('mecanico','mecanico','Cadeia modular Rexnord LF882-K450 largura 82.5mm — trecho 3m', 'Esteira Entrada', 3, 'm', 'alta', 620.00, 'pronto_aprovacao'),
    ('mecanico','mecanico','Guia lateral UHMW ajustável 3m — kit fixação inox', 'Esteira Entrada', 2, 'un', 'media', 350.00, 'rascunho'),
    ('mecanico','mecanico','Moto-redutor SEW 0.55kW/1750rpm i=30 flange B5', 'Esteira Entrada', 1, 'un', 'alta', 3200.00, 'pronto_aprovacao'),
    ('mecanico','mecanico','Sensor fotoelétrico Sick WL9-3P2432 — detecção de gargalo', 'Esteira Entrada', 2, 'un', 'media', 480.00, 'rascunho'),
    ('mecanico','mecanico','Bico de envase fundo submerso Ø10mm 316L sanitário', 'Bicos de Envase', 6, 'un', 'critica', 720.00, 'pronto_aprovacao'),
    ('mecanico','mecanico','Válvula sanitária SPX APV DELTA SW4 DN25 tri-clamp', 'Bicos de Envase', 6, 'un', 'critica', 1450.00, 'pronto_aprovacao'),
    ('mecanico','mecanico','Servo Rockwell Kinetix MPL-B330P-MJ72AA (0.9kW absolute)', 'Bicos de Envase', 6, 'un', 'critica', 4800.00, 'pronto_aprovacao'),
    ('mecanico','mecanico','Kit vedação sanitária EPDM FDA — 6 estações', 'Bicos de Envase', 1, 'kit', 'alta', 380.00, 'rascunho'),
    ('mecanico','mecanico','Guia linear THK HSR25 curso 150mm — pré-carga leve', 'Bicos de Envase', 6, 'un', 'alta', 420.00, 'rascunho'),
    ('mecanico','mecanico','Cabeçote rosqueador magnético torque 1.2–3.0 N·m Alcoa 28mm', 'Tampadora', 1, 'un', 'alta', 8600.00, 'rascunho'),
    ('mecanico','mecanico','Esteira de tampa vibratória inox 316 com bowl feeder', 'Tampadora', 1, 'un', 'alta', 5400.00, 'rascunho'),
    ('mecanico','mecanico','Sensor de presença de tampa Ifm OGH500', 'Tampadora', 2, 'un', 'media', 380.00, 'rascunho'),
    ('eletrico','eletrico','Rittal AE 1000×800×300 IP54 com ventilação forçada', 'Painel Elétrico', 1, 'un', 'alta', 4200.00, 'pronto_aprovacao'),
    ('eletrico','eletrico','Disjuntor tripolar Siemens 5SL6 63A curva C', 'Painel Elétrico', 1, 'un', 'alta', 340.00, 'rascunho'),
    ('eletrico','eletrico','Chave seccionadora Sirco M 63A + porta-cadeado', 'Painel Elétrico', 1, 'un', 'alta', 520.00, 'rascunho'),
    ('eletrico','eletrico','Fonte 24Vdc 20A Rockwell 1606-XLP', 'Painel Elétrico', 1, 'un', 'media', 620.00, 'rascunho'),
    ('eletrico','eletrico','Barramento cobre 40×5mm com isoladores — kit', 'Painel Elétrico', 1, 'kit', 'media', 480.00, 'rascunho'),
    ('eletrico','eletrico','Rockwell CompactLogix 5380 5069-L306ERM', 'Automação', 1, 'un', 'critica', 12800.00, 'pronto_aprovacao'),
    ('eletrico','eletrico','Módulo I/O digital 16in/16out 5069-IB16 / 5069-OB16', 'Automação', 4, 'un', 'alta', 1800.00, 'rascunho'),
    ('eletrico','eletrico','Módulo I/O analógico 4in/2out 5069-IF4FXOF2', 'Automação', 2, 'un', 'alta', 2400.00, 'rascunho'),
    ('eletrico','eletrico','Servo drive Kinetix 5300 2094-EN02D-M01-S0 (1kW)', 'Automação', 6, 'un', 'critica', 6200.00, 'pronto_aprovacao'),
    ('eletrico','eletrico','PowerFlex 525 25B-D1P4N104 0.75kW (esteira)', 'Automação', 1, 'un', 'alta', 1650.00, 'rascunho'),
    ('eletrico','eletrico','IHM PanelView Plus 7 12" 2711P-T12W22D9P', 'Automação', 1, 'un', 'alta', 5800.00, 'rascunho'),
    ('eletrico','eletrico','Switch industrial gerenciável Stratix 5700 8 portas', 'Automação', 1, 'un', 'media', 3200.00, 'rascunho'),
    ('eletrico','eletrico','Balança Mettler-Toledo IND570 com célula 5kg 0.02%', 'Automação', 1, 'un', 'critica', 8400.00, 'pronto_aprovacao'),
    ('eletrico','eletrico','Cortina de luz Sick C4000 altura 800mm cat 4', 'Segurança', 2, 'un', 'critica', 2800.00, 'rascunho'),
    ('eletrico','eletrico','Chave de porta Sick i10-Lock M0A2A2AG3 24V', 'Segurança', 4, 'un', 'critica', 480.00, 'rascunho'),
    ('eletrico','eletrico','Relé de segurança Sick UE410-MU3T5', 'Segurança', 1, 'un', 'critica', 1400.00, 'rascunho'),
    ('eletrico','eletrico','Botoeira emergência cogumelo Ø40mm chave 22mm', 'Segurança', 4, 'un', 'alta', 180.00, 'rascunho'),
    ('eletrico','eletrico','Sinaleiro semafórico 3 cores + buzina 24V', 'Segurança', 1, 'un', 'media', 320.00, 'rascunho'),
    ('eletrico','eletrico','Cabo de potência 4×2.5mm² blindado LAPP Ölflex — 100m', 'Cabeamento', 2, 'rolo', 'media', 780.00, 'rascunho'),
    ('eletrico','eletrico','Cabo servo Kinetix 2090-CSBM1DF-14AA07 pré-conectorizado 7m', 'Cabeamento', 6, 'un', 'alta', 850.00, 'rascunho'),
    ('eletrico','eletrico','Cabo Ethernet Cat6 industrial DLR anel — 50m', 'Cabeamento', 1, 'rolo', 'media', 620.00, 'rascunho'),
    ('eletrico','eletrico','Eletroduto flexível inox 25mm liquid-tight — 20m', 'Cabeamento', 2, 'rolo', 'baixa', 240.00, 'rascunho')
  ) AS x(disc_eq, disc_proj, descricao, sub_conjunto, qtd, un, criticidade, custo, status)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.projeto_insumos pi
     WHERE pi.equipamento_id = v_eq_id AND pi.descricao = x.descricao AND pi.deleted_at IS NULL
  );

  RAISE NOTICE 'Envasadora 1014 pronta: cliente=%, equipamento=%', v_cli_id, v_eq_id;
END $$;

NOTIFY pgrst, 'reload schema';
