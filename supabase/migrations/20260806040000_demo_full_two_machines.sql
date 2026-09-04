-- ============================================================================
-- Seed demonstrativo COMPLETO de 2 máquinas:
--   A) DEMO-EQP-004 · Envasadora Linear 1028 — Embalagens Norte Brasil  (CICLO FINALIZADO)
--   B) DEMO-EQP-005 · Envasadora Linear 1035 — Cosméticos Bella Pele    (INÍCIO DE CICLO)
-- Cobre: planejamento, engenharia, BOM/compras, produção, qualidade (FAT),
-- logística, pós-venda (SAT + chamado), comentários, custos e relatórios.
-- Idempotente: limpa e recria os registros demo dessas duas máquinas.
-- ============================================================================

DO $$
DECLARE
  -- máquinas
  eq_a uuid := '08fd25f6-3752-407d-aa55-e9a8275fe9e0';
  cli_a uuid := '30b9a0ec-4378-4585-b59a-aaf5a5595ff5';
  proc_a uuid := 'a37aadec-8e7c-478a-8736-2a512043fcde';
  eq_b uuid := '254799b1-2bc5-428b-907f-f60f37e5662f';
  cli_b uuid := 'e3daf693-f7cb-454e-967b-d1604a519e71';
  proc_b uuid := 'd5e98ecb-6290-4b84-9066-15e68be9348b';
  -- projetos
  pa_mec uuid := 'd83a32b2-3ba8-4be7-a3cf-80c92c3e2e49';
  pa_ele uuid := '5e24ffb3-0f90-43b6-a85e-f4e5107a0018';
  pb_mec uuid := '268f1fbc-4e3b-42f0-b7ea-b2d7043fc5d9';
  pb_ele uuid := 'dbbde9c1-c5c2-4e5a-81a2-1b78dbe010d7';
  -- pessoas
  u_admin uuid := 'fba899ca-020b-4439-a104-ed68561ed6a3';
  u_eng   uuid := '3a9d92a8-40e2-4c4f-b374-8e1d992c6152';
  u_prod  uuid := '5b13a01b-9c57-4005-b06d-1590a0ee3f97';
  u_mont  uuid := '68ceae02-0286-47dd-b66a-f0bd08c1ab7b';
  u_comp  uuid := 'b530625f-84e1-474a-bf5c-3d74372beff9';
  u_field uuid := '6c679000-8aca-4b27-839d-c8e76495b0a1';
  u_sales uuid := '84756d52-5984-4fa4-a6ba-43027bc555f2';
  -- fornecedores
  f_omori uuid := '9ce55740-63e3-40e1-a29a-a9fbf0034dc8';
  f_warson uuid := '54216c0e-7c78-4b94-b83e-e5b9590e9a77';
  f_btb uuid := 'ea36e06f-d5aa-4383-bf4a-248cea07f949';
  -- auxiliares
  v_fat_a uuid;
  v_fat_b uuid;
  v_cot_a uuid;
  v_cot_b uuid;
  v_conv uuid;
  v_prop uuid;
  v_oc uuid;
  v_emb uuid;
  v_ch uuid;
  v_etp uuid;
  r record;
BEGIN

-- ---------------------------------------------------------------------------
-- 0) Higiene: remover projetos duplicados dessas máquinas
-- ---------------------------------------------------------------------------
UPDATE public.equipamento_projetos SET deleted_at = now()
 WHERE equipamento_id IN (eq_a, eq_b) AND id NOT IN (pa_mec, pa_ele, pb_mec, pb_ele) AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 1) Cabeçalho dos equipamentos
-- ---------------------------------------------------------------------------
UPDATE public.cliente_equipamentos SET
  status = 'operacional',
  categoria = 'envase',
  numero_serie = 'SLTK-1028-2025-014',
  tag_cliente = 'ENV-LN02',
  localizacao = 'Planta Joinville — Linha 2 (envase de 1 L)',
  valor_venda = 987500.00,
  data_entrega = date '2026-03-18',
  data_instalacao = date '2026-03-27',
  data_garantia_fim = date '2027-03-27',
  responsavel_engenharia_id = u_eng,
  responsavel_automacao_id = u_prod,
  planejamento_template_slug = 'envasadora_linear',
  resumo = 'Envasadora linear de 8 bicos para frascos de 1 L (detergente neutro), 6.000 frascos/h, com nivelamento por célula de carga, tampadora inline Alcoa 28 mm e integração Ethernet/IP com a rotuladora existente. Ciclo completo entregue: ETP aprovado, projetos liberados, FAT homologado sem RNC aberta, embarque entregue e SAT assinada com OEE de 88% no 5º dia.',
  observacoes = 'Projeto de referência SLTK — ciclo completo concluído em 22 semanas, 4 semanas abaixo do baseline. Garantia vigente até 27/03/2027.',
  updated_at = now()
WHERE id = eq_a;

UPDATE public.cliente_equipamentos SET
  status = 'planejamento',
  categoria = 'envase',
  numero_serie = NULL,
  tag_cliente = 'ENV-COS01',
  localizacao = 'Planta Diadema — Sala limpa ISO 8 (a confirmar)',
  valor_venda = 1145000.00,
  data_entrega = date '2026-11-20',
  data_instalacao = NULL,
  data_garantia_fim = NULL,
  responsavel_engenharia_id = u_eng,
  responsavel_automacao_id = u_prod,
  planejamento_template_slug = 'envasadora_linear',
  resumo = 'Envasadora linear de 6 bicos para cosméticos viscosos (shampoo e condicionador, 200–500 mL), 3.600 frascos/h, com bomba de lóbulos sanitária, CIP integrado e rastreabilidade por lote. Projeto em fase inicial: kick-off realizado, URS em consolidação e ETP em rascunho aguardando dados de processo do cliente.',
  observacoes = 'Aguardando do cliente: curva reológica dos produtos, layout DWG da sala limpa e definição do frasco 500 mL. Baseline técnica prevista para congelar na semana 6.',
  updated_at = now()
WHERE id = eq_b;

-- ---------------------------------------------------------------------------
-- 2) Etapas por disciplina
-- ---------------------------------------------------------------------------
DELETE FROM public.equipamento_etapa_comentarios
 WHERE etapa_id IN (SELECT id FROM public.equipamento_disciplina_etapas WHERE equipamento_id IN (eq_a, eq_b));
DELETE FROM public.equipamento_disciplina_etapas WHERE equipamento_id IN (eq_a, eq_b);

-- Máquina A — todas concluídas
INSERT INTO public.equipamento_disciplina_etapas
  (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, status, progresso,
   data_vencimento, responsavel_id, responsavel_nome, created_by)
SELECT eq_a, x.d, x.o, x.t, x.des, x.p, 'concluido', 100, x.venc, x.resp, x.resp_nome, u_admin
FROM (VALUES
 ('planejamento',10,'Kick-off técnico com a Embalagens Norte','Reunião de abertura com produção e manutenção do cliente. Definidos throughput de 6.000 fr/h, frasco 1 L PEAD Ø92 mm e integração com a rotuladora Vega existente.','alta',date '2025-10-08',u_sales,'Comercial Demo'),
 ('planejamento',11,'URS aprovada e cronograma macro (26 semanas)','URS revisão B assinada pelo cliente. Marcos: freeze S06, FAT S18, embarque S21, SAT S24.','alta',date '2025-10-20',u_admin,'Marcos Rocha'),
 ('planejamento',12,'Confirmação de utilidades na planta','Ar comprimido 7 bar / 320 NL/min, 380 V 60 Hz 3F+T, ponto de água 3/4" para CIP. Medições realizadas in loco.','media',date '2025-10-28',u_field,'Campo Demo'),
 ('planejamento',13,'Layout preliminar aprovado','Envelope 3.200 × 1.400 × 2.250 mm validado contra o corredor de manutenção de 900 mm exigido pelo cliente.','alta',date '2025-11-05',u_eng,'Engenharia Demo'),
 ('planejamento',14,'APR / FMEA de projeto','FMEA com 34 modos de falha analisados; 6 ações mitigadoras incorporadas ao escopo (redundância de E-stop, dreno sanitário, proteção IP65 nos servos).','urgente',date '2025-11-12',u_eng,'Engenharia Demo'),
 ('planejamento',15,'Freeze de escopo — baseline técnica','Escopo, materiais em contato (316L Ra ≤ 0,8 µm) e plataforma de automação congelados. Qualquer alteração passa a exigir aditivo.','alta',date '2025-11-18',u_admin,'Marcos Rocha'),
 ('engenharia',20,'Concepção mecânica e envelope 3D','Modelo SolidWorks completo do conjunto: mesa 304, 8 bicos, transportador de entrada e saída para a rotuladora.','alta',date '2025-11-28',u_eng,'Engenharia Demo'),
 ('engenharia',21,'Definição de bicos e dosadores','Bicos de fundo submerso Ø10 mm com curso servo de 120 mm. Repetibilidade alvo ±0,3% validada em bancada.','urgente',date '2025-12-05',u_eng,'Engenharia Demo'),
 ('engenharia',22,'FEA do pórtico e da mesa','Carga dinâmica de 8 m/s². Deflexão máxima calculada de 0,31 mm (limite 0,50 mm).','media',date '2025-12-12',u_eng,'Engenharia Demo'),
 ('engenharia',23,'Detalhamento 2D e desenhos de fabricação','128 desenhos emitidos em R00, com tolerâncias sanitárias e notas de acabamento.','alta',date '2025-12-19',u_eng,'Engenharia Demo'),
 ('engenharia',24,'Lista de peças (BOM mecânico)','BOM mecânico com 16 linhas aprovado e liberado para compras.','alta',date '2025-12-22',u_eng,'Engenharia Demo'),
 ('engenharia',25,'Revisão crítica de projeto (DR2)','Revisão conjunta engenharia + montagem + qualidade. 9 apontamentos, todos fechados antes da liberação.','alta',date '2026-01-08',u_admin,'Marcos Rocha'),
 ('engenharia',26,'Liberação para produção','Projetos mecânico e elétrico liberados em R01 com data book completo.','urgente',date '2026-01-14',u_admin,'Marcos Rocha'),
 ('producao',30,'Diagrama unifilar e potência instalada','Potência instalada 18,4 kW, geral 63 A, seletividade verificada.','alta',date '2026-01-20',u_prod,'Produção Demo'),
 ('producao',31,'Dimensionamento e montagem do painel','Rittal AE 1000×800×300 IP54, CompactLogix 5380, 6 drives Kinetix 5300 e PowerFlex 525.','alta',date '2026-02-02',u_prod,'Produção Demo'),
 ('producao',32,'Lista de I/O e P&ID elétrico','214 pontos de I/O mapeados e conferidos ponto a ponto no comissionamento.','media',date '2026-02-06',u_prod,'Produção Demo'),
 ('producao',33,'Fabricação e caldeiraria','Estrutura soldada em TIG, decapada e polida sanitariamente (Ra 0,72 µm medido).','alta',date '2026-02-12',u_mont,'Montagem Demo'),
 ('producao',34,'Montagem mecânica final','Alinhamento dos 8 bicos, montagem da tampadora e do transportador. 186 h de montagem.','alta',date '2026-02-20',u_mont,'Montagem Demo'),
 ('producao',35,'Programação CLP','Lógica de dosagem por eixo virtual, 8 eixos sincronizados, tratamento de 42 alarmes.','alta',date '2026-02-25',u_prod,'Produção Demo'),
 ('producao',36,'Programação IHM e receitas','PanelView Plus 7 12" com 50 receitas, níveis de acesso e histórico de alarmes.','media',date '2026-02-27',u_prod,'Produção Demo'),
 ('producao',37,'Comissionamento elétrico','Auto-tune dos servos, teste de segurança PLd e verificação de aterramento equipotencial.','urgente',date '2026-03-02',u_prod,'Produção Demo'),
 ('qualidade',40,'Plano de inspeção','Plano com 13 itens de checklist e 6 parâmetros de medição aprovado pela qualidade do cliente.','media',date '2026-03-03',u_admin,'Marcos Rocha'),
 ('qualidade',41,'Testes de bancada','500 ciclos a seco por bico, sem falha de acionamento.','alta',date '2026-03-05',u_prod,'Produção Demo'),
 ('qualidade',42,'Ensaios de vazão e dosagem','CV medido de 0,21% com água a 20 °C (limite 0,30%). Histograma anexado ao relatório de FAT.','alta',date '2026-03-06',u_eng,'Engenharia Demo'),
 ('qualidade',43,'FAT interno','Pré-FAT interno com 1 apontamento (torque da tampadora), corrigido no mesmo dia.','alta',date '2026-03-09',u_admin,'Marcos Rocha'),
 ('qualidade',44,'FAT com cliente — homologado','FAT DEMO-FAT-004 homologada em 12/03/2026 com 13 itens OK e 1 RNC fechada em campo.','urgente',date '2026-03-12',u_admin,'Marcos Rocha'),
 ('qualidade',45,'Certificados e normas aplicáveis','Dossiê CE, certificados 3.1 do 316L e declaração FDA 21 CFR entregues no data book.','media',date '2026-03-14',u_admin,'Marcos Rocha'),
 ('pos_venda',50,'Embarque e desembaraço','Embarque EMB-2026-0041 entregue em 18/03/2026, 3 volumes, 4.180 kg.','alta',date '2026-03-18',u_field,'Campo Demo'),
 ('pos_venda',51,'SAT no cliente — comissionamento assistido','2 técnicos por 5 dias. OEE de 88% no 5º dia (meta 85%).','alta',date '2026-03-27',u_field,'Campo Demo'),
 ('pos_venda',52,'Treinamento de operadores','4 h de operação para 3 turnos (18 operadores) e 8 h de manutenção preventiva.','media',date '2026-03-30',u_field,'Campo Demo'),
 ('pos_venda',53,'Manuais as-built entregues','Manuais PT/EN, esquemas as-built e backup do CLP/IHM entregues em mídia e no Drive.','baixa',date '2026-04-02',u_eng,'Engenharia Demo'),
 ('pos_venda',54,'Plano de spare-parts sugerido','Kit recomendado de 14 itens críticos, cotado em R$ 38.400 e aprovado pelo cliente.','media',date '2026-04-06',u_comp,'Compras Demo'),
 ('pos_venda',55,'Início da garantia registrado','Garantia de 12 meses a partir de 27/03/2026, com 2 visitas preventivas contratadas.','baixa',date '2026-04-08',u_admin,'Marcos Rocha')
) AS x(d,o,t,des,p,venc,resp,resp_nome);

-- Máquina B — início de ciclo
INSERT INTO public.equipamento_disciplina_etapas
  (equipamento_id, disciplina, ordem, titulo, descricao, prioridade, status, progresso,
   data_vencimento, responsavel_id, responsavel_nome, created_by)
SELECT eq_b, x.d, x.o, x.t, x.des, x.p, x.st, x.pr, x.venc, x.resp, x.resp_nome, u_admin
FROM (VALUES
 ('planejamento',10,'Kick-off técnico com a Cosméticos Bella Pele','Kick-off realizado em 28/07/2026 com P&D, produção e engenharia do cliente. Escopo inicial: 6 bicos, 3.600 fr/h, frascos de 200 e 500 mL.','alta','concluido',100,date '2026-07-28',u_sales,'Comercial Demo'),
 ('planejamento',11,'Coleta de requisitos (URS rev. A)','URS rev. A redigida a partir do kick-off. Pendente a curva reológica dos produtos para fechar o cálculo da bomba.','alta','em_progresso',60,date '2026-08-14',u_eng,'Engenharia Demo'),
 ('planejamento',12,'Confirmação de utilidades','Solicitada à manutenção do cliente a confirmação de ar comprimido, energia e ponto de vapor para o CIP.','media','em_progresso',30,date '2026-08-18',u_field,'Campo Demo'),
 ('planejamento',13,'Layout preliminar da sala limpa','Aguardando DWG atualizado da sala ISO 8 para posicionar o envelope e o corredor de manutenção.','alta','bloqueado',10,date '2026-08-21',u_eng,'Engenharia Demo'),
 ('planejamento',14,'Cronograma macro (24 semanas)','Rascunho do Gantt com marcos preliminares: freeze S06, FAT S17, embarque S20.','media','em_progresso',40,date '2026-08-25',u_admin,'Marcos Rocha'),
 ('planejamento',15,'APR / FMEA preliminar','A iniciar após o freeze de escopo.','media','nao_iniciado',0,date '2026-09-04',u_eng,'Engenharia Demo'),
 ('planejamento',16,'Freeze de escopo — baseline técnica','Depende da URS rev. B e do layout aprovado.','alta','nao_iniciado',0,date '2026-09-11',u_admin,'Marcos Rocha'),
 ('engenharia',20,'Estudo de viabilidade do produto viscoso','Ensaios com amostras: shampoo 4.200 cP e condicionador 6.800 cP. Bomba de lóbulos confirmada como melhor opção frente à peristáltica.','alta','em_progresso',45,date '2026-08-20',u_eng,'Engenharia Demo'),
 ('engenharia',21,'Concepção mecânica preliminar','Croqui do conjunto em andamento: mesa 316L, 6 bicos com corte anti-gotejamento e CIP integrado.','alta','em_progresso',20,date '2026-09-02',u_eng,'Engenharia Demo'),
 ('engenharia',22,'Definição de bicos e dosadores','A definir após a validação reológica.','urgente','nao_iniciado',0,date '2026-09-15',u_eng,'Engenharia Demo'),
 ('engenharia',23,'Modelagem 3D','Não iniciado.','media','nao_iniciado',0,date '2026-09-29',u_eng,'Engenharia Demo'),
 ('engenharia',24,'Detalhamento 2D','Não iniciado.','media','nao_iniciado',0,date '2026-10-13',u_eng,'Engenharia Demo'),
 ('engenharia',25,'Lista de peças (BOM mecânico)','BOM preliminar em rascunho com 8 linhas para cotação exploratória.','alta','em_progresso',15,date '2026-10-16',u_eng,'Engenharia Demo'),
 ('engenharia',26,'Liberação para produção','Não iniciado.','urgente','nao_iniciado',0,date '2026-10-23',u_admin,'Marcos Rocha'),
 ('producao',30,'Diagrama unifilar e potência instalada','Estimativa preliminar de 12 kW; a confirmar após a definição dos servos.','media','nao_iniciado',0,date '2026-10-30',u_prod,'Produção Demo'),
 ('producao',31,'Dimensionamento do painel elétrico','Não iniciado.','media','nao_iniciado',0,date '2026-11-06',u_prod,'Produção Demo'),
 ('producao',32,'Lista de I/O e P&ID elétrico','Não iniciado.','media','nao_iniciado',0,date '2026-11-10',u_prod,'Produção Demo'),
 ('producao',33,'Programação CLP','Não iniciado.','alta','nao_iniciado',0,date '2026-11-24',u_prod,'Produção Demo'),
 ('producao',34,'Programação IHM','Não iniciado.','media','nao_iniciado',0,date '2026-11-27',u_prod,'Produção Demo'),
 ('producao',35,'Montagem mecânica','Não iniciado.','alta','nao_iniciado',0,date '2026-12-11',u_mont,'Montagem Demo'),
 ('qualidade',40,'Plano de inspeção','Não iniciado.','media','nao_iniciado',0,date '2026-12-15',u_admin,'Marcos Rocha'),
 ('qualidade',41,'Ensaios de vazão e dosagem','Não iniciado.','alta','nao_iniciado',0,date '2026-12-18',u_eng,'Engenharia Demo'),
 ('qualidade',42,'FAT interno','Não iniciado.','alta','nao_iniciado',0,date '2027-01-08',u_admin,'Marcos Rocha'),
 ('qualidade',43,'FAT com cliente','Não iniciado.','urgente','nao_iniciado',0,date '2027-01-15',u_admin,'Marcos Rocha'),
 ('pos_venda',50,'Embarque','Não iniciado.','media','nao_iniciado',0,date '2027-01-29',u_field,'Campo Demo'),
 ('pos_venda',51,'SAT / comissionamento','Não iniciado.','alta','nao_iniciado',0,date '2027-02-12',u_field,'Campo Demo'),
 ('pos_venda',52,'Treinamento de operadores','Não iniciado.','media','nao_iniciado',0,date '2027-02-19',u_field,'Campo Demo')
) AS x(d,o,t,des,p,st,pr,venc,resp,resp_nome);

-- Comentários nas etapas
INSERT INTO public.equipamento_etapa_comentarios (etapa_id, autor_id, autor_nome, texto, created_at)
SELECT e.id, c.autor, c.nome, c.texto, c.quando
FROM (VALUES
 (eq_a,'Ensaios de vazão e dosagem',u_eng,'Engenharia Demo','Fechamos o ensaio com CV de 0,21% nos 8 bicos (500 ciclos, água a 20 °C). O bico 5 ficou 0,04 pp acima dos demais e foi reajustado antes do relatório.', now() - interval '150 days'),
 (eq_a,'Ensaios de vazão e dosagem',u_admin,'Marcos Rocha','Excelente. Anexem o histograma ao relatório de FAT para o cliente ver a dispersão por bico.', now() - interval '149 days'),
 (eq_a,'FAT com cliente — homologado',u_admin,'Marcos Rocha','FAT homologada com a presença do gerente de produção do cliente. Única RNC (torque da tampadora fora da faixa em 3 de 30 amostras) foi tratada com troca da mola da capa magnética e reteste OK.', now() - interval '146 days'),
 (eq_a,'Comissionamento elétrico',u_prod,'Produção Demo','Auto-tune concluído nos 6 eixos. Categoria de segurança PLd validada com o relé UE410-MU: tempo de parada medido em 180 ms.', now() - interval '156 days'),
 (eq_a,'SAT no cliente — comissionamento assistido',u_field,'Campo Demo','Dia 5 de comissionamento: OEE de 88,2% no turno da tarde, com 6.050 fr/h de pico. Cliente assinou a SAT sem ressalvas.', now() - interval '132 days'),
 (eq_a,'Plano de spare-parts sugerido',u_comp,'Compras Demo','Kit de 14 itens críticos cotado em R$ 38.400 com lead time médio de 21 dias. Cliente aprovou e a OC entra no próximo ciclo.', now() - interval '121 days'),
 (eq_b,'Estudo de viabilidade do produto viscoso',u_eng,'Engenharia Demo','Amostras recebidas: shampoo a 4.200 cP e condicionador a 6.800 cP (25 °C). Com bico de fundo submerso e bomba de lóbulos conseguimos 3.600 fr/h sem incorporação de ar.', now() - interval '6 days'),
 (eq_b,'Estudo de viabilidade do produto viscoso',u_admin,'Marcos Rocha','Confirme com o cliente a temperatura mínima de envase no inverno — abaixo de 18 °C a viscosidade sobe e pode derrubar o throughput.', now() - interval '5 days'),
 (eq_b,'Layout preliminar da sala limpa',u_eng,'Engenharia Demo','Bloqueado: seguimos sem o DWG atualizado da sala ISO 8. Sem ele não conseguimos posicionar o corredor de manutenção nem o ponto de CIP.', now() - interval '3 days'),
 (eq_b,'Coleta de requisitos (URS rev. A)',u_sales,'Comercial Demo','Cliente sinalizou intenção de incluir o frasco de 500 mL na mesma máquina. Precisamos avaliar impacto no cabeçote e no tempo de troca de formato antes do freeze.', now() - interval '2 days')
) AS c(eqid,etapa,autor,nome,texto,quando)
JOIN public.equipamento_disciplina_etapas e ON e.equipamento_id = c.eqid AND e.titulo = c.etapa;

-- ---------------------------------------------------------------------------
-- 3) ETP
-- ---------------------------------------------------------------------------
UPDATE public.equipamento_etps SET
  status = 'aprovado', versao = 3,
  escopo = 'Fornecimento de envasadora linear automática de 8 bicos para frascos de 1 L em PEAD, incluindo transportador de entrada de 3 m, estação de envase com nivelamento por célula de carga, tampadora inline Alcoa 28 mm, painel elétrico, automação Rockwell e integração Ethernet/IP com a rotuladora Vega existente do cliente.',
  premissas = 'Utilidades fornecidas pelo cliente (380 V/60 Hz/3F+T, ar comprimido a 7 bar e 320 NL/min, água potável 3/4"). Produto único (detergente neutro, 1,02 g/cm³, 15 cP). Piso nivelado com desvio máximo de 3 mm/m. Frasco e tampa fornecidos pelo cliente conforme amostras aprovadas.',
  requisitos_funcionais = E'- Produção nominal de 6.000 frascos/h com frasco de 1 L\n- Precisão de enchimento de ±0,3% (CV) verificada em 500 ciclos\n- Troca de formato em até 10 min sem ferramentas\n- 50 receitas armazenadas na IHM com controle de acesso por nível\n- Rejeito automático de frasco sem tampa ou com rosca falha\n- Rastreabilidade por lote exportável em CSV',
  requisitos_tecnicos = E'- Materiais em contato: AISI 316L polido Ra ≤ 0,8 µm; vedações EPDM FDA\n- Estrutura em AISI 304, pés reguláveis com base antivibração\n- CLP Rockwell CompactLogix 5380; IHM PanelView Plus 7 12"\n- 8 servos Kinetix MPL com eixo virtual mestre\n- Célula de carga Mettler IND570 integrada por Ethernet/IP\n- Segurança categoria PLd conforme ISO 13849 (cortina C4000 + i10-Lock)\n- Grau de proteção IP65 na zona molhada',
  criterios_aceite = E'1. CV de enchimento ≤ 0,30% em 500 ciclos por bico (água a 20 °C)\n2. Throughput ≥ 6.000 fr/h sustentado por 60 min\n3. Torque de tampa entre 1,2 e 3,0 N·m em 30 amostras consecutivas\n4. Tempo de parada de emergência ≤ 250 ms\n5. Checklist de FAT com 100% dos itens OK ou RNC fechada\n6. OEE ≥ 85% no 5º dia de SAT',
  riscos = E'- Variação dimensional do frasco fornecido pelo cliente (mitigado com guias ajustáveis)\n- Lead time dos servos importados (mitigado com pedido antecipado na semana 3)\n- Interface com a rotuladora legada (mitigado com teste de protocolo em bancada antes do embarque)',
  observacoes = 'ETP aprovado pelo cliente em 18/11/2025. Nenhuma alteração de escopo após o freeze.',
  aprovado_por = u_admin, aprovado_em = now() - interval '260 days', updated_at = now()
WHERE equipamento_id = eq_a;

UPDATE public.equipamento_etps SET
  deleted_at = NULL, versao = 1, status = 'rascunho', cliente_id = cli_b,
  escopo = 'Envasadora linear automática de 6 bicos para produtos cosméticos viscosos (shampoo e condicionador) em frascos de 200 mL e 500 mL, com bomba de lóbulos sanitária, sistema CIP integrado e rastreabilidade por lote.',
  premissas = 'Produtos com viscosidade entre 4.000 e 7.000 cP a 25 °C. Sala limpa ISO 8 com temperatura controlada entre 20 e 24 °C. Frascos e tampas a definir com o cliente (amostras pendentes). Utilidades a confirmar com a manutenção da planta.',
  requisitos_funcionais = E'- Produção nominal de 3.600 frascos/h (200 mL)\n- Precisão de ±0,5% para produtos viscosos (a validar em ensaio)\n- Troca de formato 200 mL ↔ 500 mL em até 20 min\n- CIP automático com ciclo de soda e enxágue\n- Rastreabilidade por lote com registro de operador (a detalhar)',
  requisitos_tecnicos = E'- Materiais em contato: AISI 316L Ra ≤ 0,6 µm (exigência do cliente para cosméticos)\n- Bomba de lóbulos sanitária dimensionada após a curva reológica\n- Automação a definir entre Rockwell e Siemens conforme padrão da planta\n- Grau de proteção mínimo IP65 na zona molhada',
  criterios_aceite = 'A definir em conjunto com a qualidade do cliente após o freeze de escopo. Preliminarmente: CV ≤ 0,50%, throughput ≥ 3.600 fr/h e validação de limpabilidade do CIP por swab.',
  riscos = E'- Curva reológica ainda não fornecida (risco alto para o dimensionamento da bomba)\n- Layout da sala limpa não confirmado (bloqueia o envelope)\n- Possível inclusão do frasco de 500 mL amplia o escopo do cabeçote',
  observacoes = 'RASCUNHO — versão 1 em elaboração. Depende dos dados de processo do cliente para avançar para revisão.',
  aprovado_por = NULL, aprovado_em = NULL, updated_at = now()
WHERE equipamento_id = eq_b
RETURNING id INTO v_etp;

DELETE FROM public.equipamento_etp_historico WHERE etp_id = v_etp;


INSERT INTO public.equipamento_etp_historico (etp_id, tipo, mensagem, created_by, created_by_nome, created_at)
VALUES
 (v_etp,'alteracao','ETP criado a partir do kick-off de 28/07/2026.',u_eng,'Engenharia Demo', now() - interval '8 days'),
 (v_etp,'nota','Pendente: curva reológica dos produtos e layout DWG da sala limpa.',u_eng,'Engenharia Demo', now() - interval '5 days'),
 (v_etp,'nota','Comercial sinalizou possível inclusão do frasco de 500 mL — avaliar impacto antes de submeter para revisão.',u_sales,'Comercial Demo', now() - interval '2 days');

-- ---------------------------------------------------------------------------
-- 4) Projetos e revisões
-- ---------------------------------------------------------------------------
UPDATE public.equipamento_projetos SET
  status='liberado_producao', fase='liberacao', progresso=100, revisao='R01',
  responsavel_id=u_eng, liberado_por=u_admin, liberado_em = now() - interval '204 days',
  hh_consumida=486, observacoes='Data book mecânico completo: 128 desenhos, BOM de 16 linhas, certificados 3.1 e declaração FDA.',
  updated_at=now()
WHERE id = pa_mec;

UPDATE public.equipamento_projetos SET
  status='liberado_producao', fase='liberacao', progresso=100, revisao='R01',
  responsavel_id=u_prod, liberado_por=u_admin, liberado_em = now() - interval '204 days',
  hh_consumida=352, observacoes='EPLAN completo com 214 pontos de I/O, esquemas as-built e backup do CLP/IHM.',
  updated_at=now()
WHERE id = pa_ele;

UPDATE public.equipamento_projetos SET
  status='em_elaboracao', fase='briefing', progresso=18, revisao='R00',
  responsavel_id=u_eng, liberado_por=NULL, liberado_em=NULL, hh_consumida=64,
  observacoes='Concepção preliminar em andamento; aguardando dados reológicos e layout da sala limpa.',
  updated_at=now()
WHERE id = pb_mec;

UPDATE public.equipamento_projetos SET
  status='em_elaboracao', fase='briefing', progresso=5, revisao='R00',
  responsavel_id=u_prod, liberado_por=NULL, liberado_em=NULL, hh_consumida=12,
  observacoes='Aguardando definição da plataforma de automação (Rockwell x Siemens) pelo cliente.',
  updated_at=now()
WHERE id = pb_ele;

DELETE FROM public.equipamento_revisoes WHERE equipamento_id IN (eq_a, eq_b);
INSERT INTO public.equipamento_revisoes
 (equipamento_id, cliente_id, disciplina, numero, status, projeto_id, inspetor_id, data_inspecao,
  itens_verificados, itens_totais, nao_conformidades, observacoes, created_by)
VALUES
 (eq_a, cli_a, 'mecanica', 1, 'aprovada', pa_mec, u_eng, date '2026-01-08', 42, 42, 0, 'DR2 mecânica: 9 apontamentos abertos e todos fechados antes da liberação.', u_admin),
 (eq_a, cli_a, 'eletrica', 1, 'aprovada_com_ressalvas', pa_ele, u_prod, date '2026-01-10', 38, 38, 2, 'Duas ressalvas de identificação de bornes, corrigidas no comissionamento.', u_admin),
 (eq_a, cli_a, 'mecanica', 2, 'aprovada', pa_mec, u_eng, date '2026-03-09', 42, 42, 0, 'Revisão as-built pós-montagem, sem desvios.', u_admin),
 (eq_b, cli_b, 'mecanica', 1, 'pendente', pb_mec, u_eng, NULL, 0, 40, 0, 'Aguardando conclusão da concepção mecânica preliminar.', u_admin);

-- ---------------------------------------------------------------------------
-- 5) BOM (projeto_insumos)
-- ---------------------------------------------------------------------------
DELETE FROM public.projeto_insumos WHERE equipamento_id IN (eq_a, eq_b);

INSERT INTO public.projeto_insumos
 (projeto_id, equipamento_id, cliente_id, equipamento_disciplina, disciplina, descricao, especificacao_tecnica,
  sub_conjunto, part_number, fabricante_sugerido, quantidade, unidade, criticidade, custo_estimado_unit,
  custo_real_unit, status, lead_time_desejado_dias, necessidade_em, aprovado_por, aprovado_em, created_by)
SELECT CASE x.dp WHEN 'eletrico' THEN pa_ele ELSE pa_mec END, eq_a, cli_a, x.de, x.dp, x.desc_, x.spec, x.sub,
  x.pn, x.fab, x.qtd, x.un, x.crit::public.insumo_criticidade, x.est, x.real_, 'recebido'::public.insumo_status,
  x.lt, date '2026-01-30', u_admin, now() - interval '210 days', u_admin
FROM (VALUES
 ('mecanico','mecanico','Tubo estrutural 316L 60×60×3 mm — barras de 6 m','ASTM A554, acabamento polido','Estrutura','TB-316L-6060','Aperam',14,'un','alta',480.00,462.00,30),
 ('mecanico','mecanico','Chapa 316L 3 mm 2500×1250 mm','Laminada a frio, acabamento 2B','Estrutura','CH-316L-3','Aperam',5,'un','media',1200.00,1188.00,30),
 ('mecanico','mecanico','Pé regulável inox M20 com base antivibração','Carga 800 kg por pé','Estrutura','PE-M20-AV','Elesa',8,'un','baixa',85.00,79.00,20),
 ('mecanico','mecanico','Solda TIG e polimento sanitário Ra ≤ 0,8 µm','Serviço terceirizado com laudo de rugosidade','Estrutura',NULL,'Serviço',52,'h','alta',180.00,180.00,15),
 ('mecanico','mecanico','Cadeia modular Rexnord LF882-K450 — 3 m','Largura 82,5 mm, POM branco FDA','Esteira de entrada','LF882-K450','Rexnord',3,'m','alta',620.00,608.00,25),
 ('mecanico','mecanico','Moto-redutor SEW 0,55 kW i=30 flange B5','1750 rpm, IP55','Esteira de entrada','SA47DRN80MK4','SEW',1,'un','alta',3200.00,3105.00,35),
 ('mecanico','mecanico','Bico de envase de fundo submerso Ø10 mm 316L','Sanitário, desmontável sem ferramenta','Bicos de envase','BC-10-316L','SLTK',8,'un','critica',720.00,698.00,40),
 ('mecanico','mecanico','Válvula sanitária SPX APV DELTA SW4 DN25','Tri-clamp, atuador pneumático','Bicos de envase','SW4-DN25','SPX APV',8,'un','critica',1450.00,1412.00,45),
 ('mecanico','mecanico','Servo Rockwell Kinetix MPL-B330P-MJ72AA','0,9 kW, encoder absoluto','Bicos de envase','MPL-B330P','Rockwell',8,'un','critica',4800.00,4735.00,60),
 ('mecanico','mecanico','Guia linear THK HSR25 curso 150 mm','Pré-carga leve, com carro duplo','Bicos de envase','HSR25','THK',8,'un','alta',420.00,405.00,30),
 ('mecanico','mecanico','Cabeçote rosqueador magnético Alcoa 28 mm','Torque de 1,2 a 3,0 N·m','Tampadora','CR-ALC28','SLTK',1,'un','alta',8600.00,8420.00,50),
 ('mecanico','mecanico','Bowl feeder de tampas inox 316','Capacidade de 1.200 tampas','Tampadora','BF-316-1200','Vibratec',1,'un','alta',5400.00,5290.00,45),
 ('eletrico','eletrico','Quadro Rittal AE 1000×800×300 IP54','Com ventilação forçada e filtro','Painel elétrico','AE1080.500','Rittal',1,'un','alta',4200.00,4090.00,30),
 ('eletrico','eletrico','CLP Rockwell CompactLogix 5380 5069-L306ERM','Com motion, 6 eixos','Automação','5069-L306ERM','Rockwell',1,'un','critica',12800.00,12480.00,60),
 ('eletrico','eletrico','Servo drive Kinetix 5300 2094-EN02D-M01-S0','1 kW, safe torque off','Automação','2094-EN02D','Rockwell',8,'un','critica',6200.00,6050.00,60),
 ('eletrico','eletrico','IHM PanelView Plus 7 12" 2711P-T12W22D9P','Touch, FactoryTalk View ME','Automação','2711P-T12W22D9P','Rockwell',1,'un','alta',5800.00,5640.00,45),
 ('eletrico','eletrico','Balança Mettler-Toledo IND570 com célula de 5 kg','Precisão 0,02%, Ethernet/IP','Automação','IND570','Mettler-Toledo',1,'un','critica',8400.00,8215.00,40),
 ('eletrico','eletrico','Cortina de luz Sick C4000 altura 800 mm','Categoria 4 / PLe','Segurança','C4000-800','Sick',2,'un','critica',2800.00,2740.00,35),
 ('eletrico','eletrico','Chave de segurança Sick i10-Lock','Com bloqueio mecânico 24 V','Segurança','i10-Lock','Sick',4,'un','critica',480.00,462.00,30),
 ('eletrico','eletrico','Relé de segurança Sick UE410-MU3T5','Modular, com expansão','Segurança','UE410-MU3T5','Sick',1,'un','critica',1400.00,1360.00,30),
 ('eletrico','eletrico','Cabo servo Kinetix pré-conectorizado 7 m','2090-CSBM1DF-14AA07','Cabeamento','2090-CSBM1DF','Rockwell',8,'un','alta',850.00,822.00,45),
 ('eletrico','eletrico','Cabo de potência 4×2,5 mm² blindado — 100 m','LAPP Ölflex Classic 110 CY','Cabeamento','OLFLEX-110CY','LAPP',2,'rolo','media',780.00,755.00,20),
 ('eletrico','eletrico','Switch industrial Stratix 5700 de 8 portas','Gerenciável, DLR','Automação','1783-BMS10CGN','Rockwell',1,'un','media',3200.00,3115.00,30),
 ('eletrico','eletrico','Fonte 24 Vdc 20 A Rockwell 1606-XLP','Com redundância','Painel elétrico','1606-XLP','Rockwell',1,'un','media',620.00,598.00,20)
) AS x(de,dp,desc_,spec,sub,pn,fab,qtd,un,crit,est,real_,lt);

INSERT INTO public.projeto_insumos
 (projeto_id, equipamento_id, cliente_id, equipamento_disciplina, disciplina, descricao, especificacao_tecnica,
  sub_conjunto, quantidade, unidade, criticidade, custo_estimado_unit, status, lead_time_desejado_dias,
  necessidade_em, observacoes, created_by)
SELECT CASE x.dp WHEN 'eletrico' THEN pb_ele ELSE pb_mec END, eq_b, cli_b, x.de, x.dp, x.desc_, x.spec, x.sub,
  x.qtd, x.un, x.crit::public.insumo_criticidade, x.est, x.st::public.insumo_status, x.lt, date '2026-10-15', x.obs, u_eng
FROM (VALUES
 ('mecanico','mecanico','Bomba de lóbulos sanitária DN25 para 6.800 cP','Vazão 0,2–1,2 L/ciclo, tri-clamp','Dosagem',6,'un','critica',9800.00,'pronto_aprovacao',60,'Dimensionamento final depende da curva reológica.'),
 ('mecanico','mecanico','Bico anti-gotejamento com corte por sucção Ø12 mm','316L Ra ≤ 0,6 µm','Dosagem',6,'un','critica',1150.00,'rascunho',45,'Especificação preliminar.'),
 ('mecanico','mecanico','Skid CIP com tanque de 100 L e bomba centrífuga','Ciclo soda 2% + enxágue','CIP',1,'un','alta',24500.00,'rascunho',75,'Escopo a confirmar com a qualidade do cliente.'),
 ('mecanico','mecanico','Chapa 316L 3 mm 2500×1250 mm — acabamento espelhado','Ra ≤ 0,6 µm','Estrutura',5,'un','media',1420.00,'rascunho',30,NULL),
 ('mecanico','mecanico','Guia linear THK HSR25 curso 180 mm','Curso maior para frasco de 500 mL','Dosagem',6,'un','alta',460.00,'rascunho',30,'Curso depende da definição do frasco de 500 mL.'),
 ('mecanico','mecanico','Transportador de entrada 2,5 m com esteira POM FDA','Velocidade 5–20 m/min','Transporte',1,'un','media',18900.00,'rascunho',40,NULL),
 ('mecanico','mecanico','Kit de vedações EPDM FDA para 6 estações','Compatível com tensoativos','Dosagem',1,'kit','alta',430.00,'rascunho',20,NULL),
 ('eletrico','eletrico','CLP de médio porte (Rockwell ou Siemens) — a definir','6 eixos de movimento','Automação',1,'un','critica',13500.00,'rascunho',60,'Plataforma pendente de definição do cliente.'),
 ('eletrico','eletrico','IHM 12" touch com receitas','Mínimo 50 receitas','Automação',1,'un','alta',6100.00,'rascunho',45,NULL),
 ('eletrico','eletrico','Servo drive 1 kW com STO','6 unidades','Automação',6,'un','critica',6400.00,'rascunho',60,NULL),
 ('eletrico','eletrico','Quadro elétrico inox 316 IP66 para sala limpa','Exigência da área cosmética','Painel elétrico',1,'un','alta',9800.00,'pronto_aprovacao',40,'Inox exigido pela política de sala limpa do cliente.'),
 ('eletrico','eletrico','Cortina de luz cat. 4 altura 900 mm','PLe','Segurança',2,'un','critica',3100.00,'rascunho',35,NULL),
 ('eletrico','eletrico','Leitor de código de barras para rastreabilidade de lote','Ethernet/IP','Automação',1,'un','media',4200.00,'rascunho',30,'Escopo de rastreabilidade em discussão.')
) AS x(de,dp,desc_,spec,sub,qtd,un,crit,est,st,lt,obs);

INSERT INTO public.projeto_insumo_historico (projeto_id, tipo, user_id, user_nome, descricao, created_at)
VALUES
 (pa_mec,'envio_aprovacao',u_admin,'Marcos Rocha','BOM mecânico com 12 linhas aprovado e liberado para cotação.', now() - interval '215 days'),
 (pa_ele,'envio_aprovacao',u_admin,'Marcos Rocha','BOM elétrico com 12 linhas aprovado e liberado para cotação.', now() - interval '214 days'),
 (pa_mec,'edicao_manual',u_comp,'Compras Demo','Todos os itens recebidos e conferidos. Desvio de custo final de -2,4% frente ao estimado.', now() - interval '190 days'),
 (pb_mec,'criacao',u_eng,'Engenharia Demo','BOM preliminar criado para cotação exploratória da bomba de lóbulos e do skid CIP.', now() - interval '4 days');

-- ---------------------------------------------------------------------------
-- 6) Cotações e ordem de compra
-- ---------------------------------------------------------------------------
DELETE FROM public.cotacoes WHERE codigo IN ('COT-DEMO-1028-01','COT-DEMO-1035-01');
DELETE FROM public.ordens_compra WHERE numero = 'OC-DEMO-1028-01';

INSERT INTO public.cotacoes (codigo, titulo, descricao, status, prazo_resposta, incoterm, moeda,
  condicoes_pagamento, observacoes, criado_por, responsavel_compras, origem, projeto_id, created_at)
VALUES ('COT-DEMO-1028-01','Envasadora 1028 — pacote de automação Rockwell',
  'Cotação do pacote de automação (CLP, drives, IHM, switch e cabos) para a Envasadora Linear 1028.',
  'encerrada', date '2025-12-15','DAP','BRL','30/60 dias',
  'Três fornecedores convidados. Escolhido o de melhor prazo com preço 1,8% acima do menor.',
  u_comp, u_comp,'bom', pa_ele, now() - interval '235 days')
RETURNING id INTO v_cot_a;

INSERT INTO public.cotacao_itens (cotacao_id, insumo_id, quantidade, unidade, descricao_snapshot, spec_snapshot, created_at)
SELECT v_cot_a, i.id, i.quantidade, i.unidade, i.descricao, i.especificacao_tecnica, now() - interval '235 days'
FROM public.projeto_insumos i
WHERE i.equipamento_id = eq_a AND i.sub_conjunto = 'Automação' AND i.deleted_at IS NULL;

INSERT INTO public.cotacao_fornecedores (cotacao_id, fornecedor_id, email_enviado_para, enviado_em, visualizado_em, respondido_em, status)
VALUES (v_cot_a, f_omori,'sales@omori-demo.com', now() - interval '234 days', now() - interval '233 days', now() - interval '230 days','respondido')
RETURNING id INTO v_conv;

INSERT INTO public.cotacao_propostas (convite_id, validade, lead_time_dias, frete, observacoes_fornecedor, submetido_em, resumo_ai, valor_detectado, moeda_detectada, lead_time_detectado, condicao_pagamento_detectada, analise_status, analisado_em)
VALUES (v_conv, date '2026-01-15', 55, 4800, 'Preço firme por 30 dias. Entrega em lote único.', now() - interval '230 days',
  'Proposta completa cobrindo os 5 itens de automação; lead time de 55 dias, 5 dias abaixo da necessidade do cronograma.',
  118940.00,'BRL',55,'30/60 dias','concluida', now() - interval '229 days')
RETURNING id INTO v_prop;

INSERT INTO public.cotacao_proposta_itens (proposta_id, cotacao_item_id, preco_unit, prazo_entrega_dias, marca_oferecida, quantidade_snapshot)
SELECT v_prop, ci.id, round(i.custo_real_unit * 1.02, 2), 55, i.fabricante_sugerido, ci.quantidade
FROM public.cotacao_itens ci JOIN public.projeto_insumos i ON i.id = ci.insumo_id
WHERE ci.cotacao_id = v_cot_a;

INSERT INTO public.cotacao_escolhas (cotacao_item_id, proposta_item_id, escolhido_por, escolhido_em, justificativa)
SELECT ci.id, pi.id, u_comp, now() - interval '228 days','Melhor prazo de entrega com preço dentro da faixa orçada; fornecedor com histórico A.'
FROM public.cotacao_itens ci JOIN public.cotacao_proposta_itens pi ON pi.cotacao_item_id = ci.id
WHERE ci.cotacao_id = v_cot_a;

INSERT INTO public.ordens_compra (numero, cotacao_id, fornecedor_id, projeto_id, cliente_id, status, tipo, moeda,
  incoterm, emissao_em, entrega_prevista, enviado_em, aprovado_em, aprovado_por, condicao_pagamento,
  observacoes, fornecedor_razao_social, valor_subtotal, valor_frete, valor_total, criado_por, created_at)
VALUES ('OC-DEMO-1028-01', v_cot_a, f_omori, pa_ele, cli_a,'recebida','normal','BRL','DAP',
  date '2025-12-18', date '2026-02-10', now() - interval '226 days', now() - interval '227 days', u_admin,'30/60 dias',
  'Pacote de automação recebido integralmente em 06/02/2026, 4 dias antes do previsto.',
  'Beijing Omori Packing Machinery Co., Ltd.', 118940.00, 4800.00, 123740.00, u_comp, now() - interval '227 days')
RETURNING id INTO v_oc;

INSERT INTO public.ordem_compra_itens (ordem_compra_id, insumo_id, ordem, descricao, unidade, quantidade, saldo, data_entrega, valor_unitario)
SELECT v_oc, i.id, row_number() over (order by i.descricao), i.descricao, i.unidade, i.quantidade, 0, date '2026-02-06',
       round(i.custo_real_unit * 1.02, 2)
FROM public.projeto_insumos i
WHERE i.equipamento_id = eq_a AND i.sub_conjunto = 'Automação' AND i.deleted_at IS NULL;

INSERT INTO public.ordem_compra_historico (ordem_compra_id, usuario_id, usuario_nome, acao, status_anterior, status_novo, created_at)
VALUES
 (v_oc,u_comp,'Compras Demo','criou',NULL,'rascunho', now() - interval '228 days'),
 (v_oc,u_admin,'Marcos Rocha','aprovou','aguardando_aprovacao','aprovada', now() - interval '227 days'),
 (v_oc,u_comp,'Compras Demo','enviou ao fornecedor','aprovada','enviada', now() - interval '226 days'),
 (v_oc,u_comp,'Compras Demo','recebimento total conferido','enviada','recebida', now() - interval '181 days');

INSERT INTO public.cotacoes (codigo, titulo, descricao, status, prazo_resposta, incoterm, moeda,
  condicoes_pagamento, observacoes, criado_por, responsavel_compras, origem, projeto_id, created_at)
VALUES ('COT-DEMO-1035-01','Envasadora 1035 — cotação exploratória de dosagem viscosa',
  'Cotação exploratória de bomba de lóbulos sanitária e skid CIP para orçar a proposta da Bella Pele.',
  'aberta', date '2026-08-28','EXW','BRL','A definir',
  'Cotação exploratória — quantidades e specs podem mudar após o freeze de escopo.',
  u_comp, u_comp,'bom', pb_mec, now() - interval '3 days')
RETURNING id INTO v_cot_b;

INSERT INTO public.cotacao_itens (cotacao_id, insumo_id, quantidade, unidade, descricao_snapshot, spec_snapshot, observacoes, created_at)
SELECT v_cot_b, i.id, i.quantidade, i.unidade, i.descricao, i.especificacao_tecnica,'Spec preliminar — confirmar após ensaio reológico.', now() - interval '3 days'
FROM public.projeto_insumos i
WHERE i.equipamento_id = eq_b AND i.sub_conjunto IN ('Dosagem','CIP') AND i.deleted_at IS NULL;

INSERT INTO public.cotacao_fornecedores (cotacao_id, fornecedor_id, email_enviado_para, enviado_em, visualizado_em, status)
VALUES
 (v_cot_b, f_btb,'sales@btbvalve-demo.com', now() - interval '3 days', now() - interval '2 days','visualizado'),
 (v_cot_b, f_warson,'sales@warsonco-demo.com', now() - interval '3 days', NULL,'pendente');

-- ---------------------------------------------------------------------------
-- 7) Montagem
-- ---------------------------------------------------------------------------
DELETE FROM public.equipamento_montagens WHERE equipamento_id IN (eq_a, eq_b);
INSERT INTO public.equipamento_montagens
 (equipamento_id, cliente_id, status, progresso, inicio_previsto, fim_previsto, inicio_real, fim_real,
  responsavel_id, observacoes, created_by)
VALUES
 (eq_a, cli_a,'concluida',100, date '2026-01-19', date '2026-02-27', date '2026-01-19', date '2026-02-24', u_mont,
  'Montagem concluída 3 dias antes do previsto. 186 h de montagem mecânica e 74 h de elétrica. Zero retrabalho registrado.', u_admin),
 (eq_b, cli_b,'nao_iniciada',0, date '2026-11-16', date '2026-12-18', NULL, NULL, u_mont,
  'Aguardando liberação dos projetos para produção.', u_admin);

-- ---------------------------------------------------------------------------
-- 8) FAT
-- ---------------------------------------------------------------------------
SELECT id INTO v_fat_a FROM public.fat_relatorios WHERE codigo = 'DEMO-FAT-004';
SELECT id INTO v_fat_b FROM public.fat_relatorios WHERE codigo = 'DEMO-FAT-005';

UPDATE public.fat_relatorios SET
  status='homologado', progresso=100, ok_count=32, nok_count=1, na_count=0,
  os_codigo='OS-2026-0184', tag_equipamento='ENV-LN02', data_ensaio = date '2026-03-12', hora_inicio = time '08:30',
  inspetor_id = u_admin, testemunha_nome='Ricardo Menezes — Gerente de Produção (Embalagens Norte)',
  local_ensaio='SLTK Americas — Galpão de testes, Joinville/SC',
  temperatura_c = 23.4, umidade_rel = 58, tensao_alimentacao='380 V / 60 Hz / 3F+T',
  periodo_de = date '2026-03-11', periodo_ate = date '2026-03-12',
  tecnicos='Engenharia Demo, Produção Demo, Montagem Demo',
  observacoes_gerais='FAT executada em 2 dias com o cliente presente. 500 ciclos de dosagem por bico com CV de 0,21%. Uma RNC aberta (torque de tampa) e fechada no mesmo ensaio após troca da mola da capa magnética. Equipamento homologado para embarque.',
  homologado_em = now() - interval '146 days', homologado_por = u_admin, updated_at = now()
WHERE id = v_fat_a;

UPDATE public.fat_relatorios SET
  status='rascunho', progresso=0, ok_count=0, nok_count=0, na_count=0,
  os_codigo='OS-2026-0311', tag_equipamento='ENV-COS01', data_ensaio = NULL,
  inspetor_id = u_admin, local_ensaio='SLTK Americas — Galpão de testes, Joinville/SC',
  observacoes_gerais='Relatório criado como reserva de agenda. Ensaio previsto para a semana 17 do projeto, após a liberação dos projetos e a montagem.',
  updated_at = now()
WHERE id = v_fat_b;

DELETE FROM public.fat_checklist_resposta WHERE fat_id = v_fat_a;
INSERT INTO public.fat_checklist_resposta (fat_id, template_id, status, comentario, updated_by)
SELECT v_fat_a, t.id,
  CASE WHEN t.titulo LIKE 'Distribuição do produto%' THEN 'nok' ELSE 'ok' END::public.fat_item_status,
  CASE t.secao
    WHEN 'inspecao_visual' THEN 'Verificado em 11/03/2026 com o cliente presente. Rugosidade sanitária medida em 0,72 µm e TAG ENV-LN02 aplicada.'
    WHEN 'documentacao' THEN 'Data book completo entregue em mídia e no Drive: 128 desenhos R01, BOM com part numbers OEM e manual PT/EN.'
    WHEN 'ensaios_eletricos' THEN 'Ensaios executados com megôhmetro e hipot: isolação de 480 MΩ, rigidez OK e continuidade de PE em 0,04 Ω.'
    WHEN 'funcional' THEN 'CLP e IHM energizados sem falha; 214 pontos de I/O conferidos e 50 receitas carregadas e testadas.'
    WHEN 'seguranca' THEN 'Categoria PLd validada: 4 botoeiras testadas, cortina C4000 e i10-Lock funcionais, parada em 180 ms.'
    WHEN 'qualidade_produto' THEN CASE WHEN t.titulo LIKE 'Distribuição do produto%'
        THEN 'RNC-1028-01: 3 de 30 amostras com torque de tampa fora da faixa por fadiga da mola da capa magnética. Mola substituída e reteste OK no mesmo ensaio.'
        ELSE 'Amostragem de 30 frascos com volume médio de 999,4 mL e CV de 0,21%; selagem e aparência dentro do padrão.' END
    WHEN 'treinamento' THEN 'Treinamento programado para a SAT: 18 operadores em 3 turnos e 4 mantenedores.'
    ELSE 'Embalagem em 3 volumes com instruções de içamento e recebimento entregues à logística do cliente.'
  END,
  u_admin
FROM public.fat_checklist_template t WHERE t.ativo;

DELETE FROM public.fat_medicoes WHERE fat_id = v_fat_a;
INSERT INTO public.fat_medicoes (fat_id, ordem, parametro, unidade, nominal, tolerancia, medido, status_auto)
VALUES
 (v_fat_a,1,'Produção nominal com frasco de 1 L','fr/h',6000,'≥ 6.000',6050,'ok'),
 (v_fat_a,2,'Coeficiente de variação de enchimento (500 ciclos)','%',0.30,'≤ 0,30',0.21,'ok'),
 (v_fat_a,3,'Volume médio dosado','mL',1000,'±3 mL',999.4,'ok'),
 (v_fat_a,4,'Torque de fechamento da tampa','N·m',2.1,'1,2 a 3,0',2.24,'ok'),
 (v_fat_a,5,'Tempo de parada de emergência','ms',250,'≤ 250',180,'ok'),
 (v_fat_a,6,'Consumo de ar comprimido','NL/min',320,'≤ 340',298,'ok'),
 (v_fat_a,7,'Tempo de troca de formato','min',10,'≤ 10',8,'ok'),
 (v_fat_a,8,'Nível de ruído a 1 m','dB(A)',80,'≤ 80',74,'ok');

DELETE FROM public.fat_rnc WHERE fat_id = v_fat_a;
INSERT INTO public.fat_rnc (codigo, fat_id, titulo, descricao, plano_acao, responsavel_id, prazo, status, created_by)
VALUES ('RNC-1028-01', v_fat_a,'Troca de formato acima de 10 min',
  'Na primeira medição, a troca de formato levou 12 min por interferência da guia lateral do transportador de entrada.',
  'Rebaixar o batente da guia lateral em 4 mm e substituir o manípulo por versão de aperto rápido. Reteste realizado no mesmo dia com 8 min.',
  u_mont, date '2026-03-12','fechada', u_admin);

-- ---------------------------------------------------------------------------
-- 9) Logística
-- ---------------------------------------------------------------------------
DELETE FROM public.logistica_embarques WHERE numero = 'EMB-DEMO-1028';
INSERT INTO public.logistica_embarques (numero, projeto_id, status, previsao_saida, data_saida, data_entrega,
  nf_saida, destino, observacoes, created_by, created_at)
VALUES ('EMB-DEMO-1028', pa_mec,'entregue', date '2026-03-16', now() - interval '143 days', now() - interval '141 days',
  '000.184.552','Embalagens Norte Brasil Ltda — Rod. BR-101 km 42, Joinville/SC',
  '3 volumes, 4.180 kg no total. Carga em caminhão baú com içamento por ponte rolante no destino. Entrega sem avarias, canhoto assinado pela manutenção.',
  u_field, now() - interval '146 days')
RETURNING id INTO v_emb;

INSERT INTO public.logistica_embarque_itens (embarque_id, descricao, quantidade, unidade, peso_kg, volume_m3, serial, ordem)
VALUES
 (v_emb,'Conjunto principal da envasadora (mesa + 8 bicos + tampadora)',1,'un',2860,10.6,'SLTK-1028-2025-014',1),
 (v_emb,'Transportador de entrada de 3 m desmontado',1,'un',420,2.4,'SLTK-1028-TR-01',2),
 (v_emb,'Painel elétrico Rittal AE + kit de cabos pré-conectorizados',1,'un',900,1.8,'SLTK-1028-PN-01',3);

INSERT INTO public.logistica_embarque_status_log (embarque_id, from_status, to_status, notas, changed_by, changed_at)
VALUES
 (v_emb, NULL,'rascunho','Embarque criado após homologação da FAT.', u_field, now() - interval '146 days'),
 (v_emb,'rascunho','programado','Coleta agendada com a transportadora para 16/03.', u_field, now() - interval '145 days'),
 (v_emb,'programado','embarcado','Carga conferida e NF 000.184.552 emitida.', u_field, now() - interval '143 days'),
 (v_emb,'embarcado','entregue','Entrega confirmada em 18/03/2026 às 10h20, sem avarias.', u_field, now() - interval '141 days');

-- ---------------------------------------------------------------------------
-- 10) Pós-venda: SAT e chamado
-- ---------------------------------------------------------------------------
UPDATE public.sat_relatorio SET
  status='assinado', equipamento_ids = ARRAY[eq_a]::uuid[], cliente_id = cli_a,
  periodo_de = date '2026-03-23', periodo_ate = date '2026-03-27',
  local_endereco='Embalagens Norte Brasil Ltda — Rod. BR-101 km 42, Joinville/SC',
  motivos_viagem = ARRAY['Instalação','Comissionamento','Treinamento'],
  tecnicos = '[{"nome":"Campo Demo","funcao":"Técnico de campo sênior"},{"nome":"Produção Demo","funcao":"Automação"}]'::jsonb,
  tecnico_ids = ARRAY[u_field, u_prod]::uuid[],
  observacoes='Comissionamento assistido em 5 dias. Dia 1: posicionamento e nivelamento. Dia 2: ligações elétricas e pneumáticas. Dia 3: calibração dos 8 bicos e da célula de carga. Dia 4: produção assistida com 3 lotes reais. Dia 5: OEE de 88,2% e treinamento dos 3 turnos. Cliente assinou sem ressalvas.',
  assinatura_cliente = '{"nome":"Ricardo Menezes","cargo":"Gerente de Produção","assinado_em":"2026-03-27T17:40:00Z"}'::jsonb,
  assinatura_tecnico = '{"nome":"Campo Demo","cargo":"Técnico de campo sênior","assinado_em":"2026-03-27T17:35:00Z"}'::jsonb,
  updated_at = now()
WHERE codigo = 'DEMO-SAT-004';

UPDATE public.sat_relatorio SET deleted_at = now()
 WHERE codigo = 'DEMO-SAT-005' AND deleted_at IS NULL;

DELETE FROM public.chamados WHERE codigo IN ('CH-DEMO-1028-01');
INSERT INTO public.chamados (codigo, token_hash, status, origem, visitante_nome, visitante_email, visitante_telefone,
  numero_serie, equipamento_id, cliente_id, assunto, descricao_inicial, atendente_id, atendente_nome,
  prioridade, ultima_mensagem_em, ultima_mensagem_por, created_at, first_response_at, resolvido_em)
VALUES ('CH-DEMO-1028-01', md5('demo-token-1028'),'resolvido','interno',
  'Ricardo Menezes','ricardo.menezes@embalagensnorte-demo.com','+55 47 99999-0101',
  'SLTK-1028-2025-014', eq_a, cli_a,'Alarme intermitente de nível no pulmão',
  'Após 3 semanas de operação, a máquina apresenta alarme intermitente de nível baixo no pulmão durante a troca de lote, mesmo com o tanque cheio. O alarme some sozinho depois de alguns segundos.',
  u_field,'Campo Demo','media', now() - interval '96 days','atendente', now() - interval '101 days', now() - interval '100 days', now() - interval '96 days');

SELECT id INTO v_ch FROM public.chamados WHERE codigo = 'CH-DEMO-1028-01';

INSERT INTO public.chamado_mensagens (chamado_id, autor_tipo, autor_id, autor_nome, conteudo, interno, created_at)
VALUES
 (v_ch,'visitante',NULL,'Ricardo Menezes','Bom dia. O alarme de nível baixo aparece na troca de lote e some sozinho. Isso para a linha por alguns segundos.', false, now() - interval '101 days'),
 (v_ch,'atendente',u_field,'Campo Demo','Bom dia, Ricardo. Provavelmente é oscilação do sensor capacitivo durante o refil. Consegue nos enviar um vídeo do alarme e a foto da tela de diagnóstico da IHM?', false, now() - interval '100 days'),
 (v_ch,'sistema',NULL,'Sistema','Chamado vinculado ao equipamento SLTK-1028-2025-014 (Envasadora Linear 1028).', true, now() - interval '100 days'),
 (v_ch,'visitante',NULL,'Ricardo Menezes','Enviei o vídeo por WhatsApp. O alarme aparece exatamente quando a bomba de refil liga.', false, now() - interval '99 days'),
 (v_ch,'atendente',u_prod,'Produção Demo','Confirmado: a turbulência do refil descobre o sensor por instantes. Vamos aplicar um filtro de 2 s no bloco de alarme do CLP e reposicionar o Ifm KI5083 em 40 mm.', true, now() - interval '98 days'),
 (v_ch,'atendente',u_field,'Campo Demo','Ricardo, ajustamos remotamente o filtro de tempo do alarme e enviamos as instruções para reposicionar o sensor. Pode testar no próximo lote?', false, now() - interval '97 days'),
 (v_ch,'visitante',NULL,'Ricardo Menezes','Testamos em 4 lotes hoje e não houve mais nenhum alarme. Pode encerrar. Obrigado pela agilidade!', false, now() - interval '96 days');

INSERT INTO public.chamado_eventos (chamado_id, tipo, from_status, to_status, autor_id, autor_nome, at)
VALUES
 (v_ch,'criado',NULL,'aberto',NULL,'Ricardo Menezes', now() - interval '101 days'),
 (v_ch,'assumido','aberto','em_analise',u_field,'Campo Demo', now() - interval '100 days'),
 (v_ch,'vinculado_equipamento',NULL,'em_analise',u_field,'Campo Demo', now() - interval '100 days'),
 (v_ch,'status_change','em_analise','aguardando_cliente',u_field,'Campo Demo', now() - interval '97 days'),
 (v_ch,'resolvido','aguardando_cliente','resolvido',u_field,'Campo Demo', now() - interval '96 days');

-- ---------------------------------------------------------------------------
-- 11) Processos: estágio, progresso, tarefas e timeline
-- ---------------------------------------------------------------------------
UPDATE public.processos SET stage='Pós-venda', progresso=100, risco='Baixo', valor=987500,
  previsao = date '2026-03-27', stage_entered_at = now() - interval '132 days', updated_at = now()
WHERE id = proc_a;

UPDATE public.processos SET stage='ETP', progresso=12, risco='Médio', valor=1145000,
  previsao = date '2027-01-29', stage_entered_at = now() - interval '8 days', updated_at = now()
WHERE id = proc_b;

DELETE FROM public.processo_tarefas WHERE processo_id IN (proc_a, proc_b);
INSERT INTO public.processo_tarefas (processo_id, titulo, pilar_id, prazo, status)
VALUES
 (proc_a,'Encerrar dossiê técnico e arquivar data book', u_admin, now() - interval '120 days','concluida'),
 (proc_a,'Agendar 1ª visita preventiva de garantia', u_admin, now() + interval '40 days','aberta'),
 (proc_b,'Cobrar curva reológica dos produtos', u_admin, now() + interval '4 days','aberta'),
 (proc_b,'Obter DWG atualizado da sala limpa ISO 8', u_admin, now() + interval '6 days','aberta'),
 (proc_b,'Consolidar URS rev. B e submeter ETP para revisão', u_admin, now() + interval '15 days','aberta'),
 (proc_b,'Decidir plataforma de automação com o cliente', u_admin, now() + interval '20 days','aberta');

DELETE FROM public.processo_eventos WHERE processo_id IN (proc_a, proc_b);
INSERT INTO public.processo_eventos (processo_id, kind, text, at, created_by)
VALUES
 (proc_a,'created','Processo aberto após aprovação da proposta pela Embalagens Norte Brasil.', now() - interval '300 days', u_sales),
 (proc_a,'stage_change','ETP aprovado pelo cliente — avanço para Orçamento/OC.', now() - interval '260 days', u_admin),
 (proc_a,'stage_change','Projetos mecânico e elétrico liberados para produção.', now() - interval '204 days', u_admin),
 (proc_a,'note','Montagem concluída 3 dias antes do previsto, sem retrabalho.', now() - interval '164 days', u_mont),
 (proc_a,'stage_change','FAT DEMO-FAT-004 homologada com 1 RNC fechada.', now() - interval '146 days', u_admin),
 (proc_a,'stage_change','Embarque EMB-DEMO-1028 entregue no cliente.', now() - interval '141 days', u_field),
 (proc_a,'note','SAT DEMO-SAT-004 assinada com OEE de 88,2%. Garantia iniciada em 27/03/2026.', now() - interval '132 days', u_field),
 (proc_b,'created','Processo aberto após aceite da proposta técnica preliminar da Bella Pele.', now() - interval '10 days', u_sales),
 (proc_b,'note','Kick-off técnico realizado em 28/07/2026 com P&D e produção do cliente.', now() - interval '8 days', u_sales),
 (proc_b,'note','Amostras de shampoo e condicionador recebidas para ensaio de viscosidade.', now() - interval '6 days', u_eng),
 (proc_b,'note','Layout bloqueado: aguardando DWG atualizado da sala limpa ISO 8.', now() - interval '3 days', u_eng);

END $$;

NOTIFY pgrst, 'reload schema';
