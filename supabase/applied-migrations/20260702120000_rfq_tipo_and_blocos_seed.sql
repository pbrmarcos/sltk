-- =============================================================
-- Solicitação de Cotação (RFQ) — registra o tipo no Central de
-- Documentos, cria layout default e seed dos blocos trilíngues.
-- Sem esse seed, a geração cai no fallback interno e ignora o layout.
-- =============================================================

INSERT INTO public.documento_tipos (codigo, nome, prefixo_codigo, ativo)
VALUES ('solicitacao_cotacao','Solicitação de Cotação','RFQ',true)
ON CONFLICT (codigo) DO UPDATE
  SET nome = EXCLUDED.nome,
      prefixo_codigo = EXCLUDED.prefixo_codigo,
      ativo = true;

INSERT INTO public.documento_layout_config
  (tipo_codigo, accent_color, logo_url, empresa_nome, empresa_endereco, empresa_contato, rodape_extra)
SELECT 'solicitacao_cotacao',
       COALESCE(l.accent_color, '#0B3D91'),
       l.logo_url,
       COALESCE(l.empresa_nome, 'Solutek'),
       l.empresa_endereco,
       l.empresa_contato,
       l.rodape_extra
FROM (SELECT * FROM public.documento_layout_config WHERE tipo_codigo = 'orcamento' LIMIT 1) l
ON CONFLICT (tipo_codigo) DO NOTHING;

INSERT INTO public.documento_layout_config
  (tipo_codigo, accent_color, empresa_nome)
VALUES ('solicitacao_cotacao', '#0B3D91', 'Solutek')
ON CONFLICT (tipo_codigo) DO NOTHING;

DO $$
DECLARE
  v_blocos jsonb := $json$
  [
    {"codigo":"introducao","nome":"Introdução","ordem":10,"obrig":true,
     "pt":{"titulo":"Prezados,","texto":"Solicitamos a gentileza de enviarem proposta comercial para o item abaixo relacionado, referente ao projeto {{projeto.codigo}} (Rev. {{projeto.revisao}}) — cliente {{cliente.codigo}}."},
     "es":{"titulo":"Estimados,","texto":"Solicitamos amablemente el envío de propuesta comercial para el ítem abajo detallado, correspondiente al proyecto {{projeto.codigo}} (Rev. {{projeto.revisao}}) — cliente {{cliente.codigo}}."},
     "en":{"titulo":"Dear Supplier,","texto":"We kindly request a commercial proposal for the item detailed below, related to project {{projeto.codigo}} (Rev. {{projeto.revisao}}) — customer {{cliente.codigo}}."}},

    {"codigo":"especificacao_tecnica","nome":"Especificação Técnica","ordem":30,"obrig":false,
     "pt":{"titulo":"Especificação técnica","texto":"{{item.especificacao}}"},
     "es":{"titulo":"Especificación técnica","texto":"{{item.especificacao}}"},
     "en":{"titulo":"Technical specification","texto":"{{item.especificacao}}"}},

    {"codigo":"condicoes_comerciais","nome":"Condições Comerciais Desejadas","ordem":40,"obrig":true,
     "pt":{"titulo":"Condições comerciais desejadas","texto":"Solicitamos que sua proposta contemple:\n• Preço unitário e total, com moeda especificada.\n• Prazo de entrega (lead time) em dias corridos.\n• Condição de pagamento (ex.: NET30, 30/70, T/T).\n• Incoterm aplicável.\n• Validade da proposta.\n• Origem/fabricação do item e certificações aplicáveis."},
     "es":{"titulo":"Condiciones comerciales deseadas","texto":"Solicitamos que su propuesta contemple:\n• Precio unitario y total, con moneda especificada.\n• Plazo de entrega (lead time) en días corridos.\n• Condición de pago (p.ej.: NET30, 30/70, T/T).\n• Incoterm aplicable.\n• Validez de la propuesta.\n• Origen/fabricación del ítem y certificaciones aplicables."},
     "en":{"titulo":"Desired commercial terms","texto":"Please include in your proposal:\n• Unit and total price, currency specified.\n• Delivery lead time in calendar days.\n• Payment terms (e.g., NET30, 30/70, T/T).\n• Applicable Incoterm.\n• Proposal validity.\n• Item origin/manufacturing and applicable certifications."}},

    {"codigo":"entrega","nome":"Prazo e Necessidade","ordem":50,"obrig":false,
     "pt":{"titulo":"Prazo e necessidade","texto":"Necessitamos do item até {{item.necessidade_em}}. Lead time desejado: {{item.lead_time}} dia(s). Criticidade do item: {{item.criticidade}}."},
     "es":{"titulo":"Plazo y necesidad","texto":"Necesitamos el ítem hasta {{item.necessidade_em}}. Plazo deseado: {{item.lead_time}} día(s). Criticidad del ítem: {{item.criticidade}}."},
     "en":{"titulo":"Timeline & criticality","texto":"We need the item by {{item.necessidade_em}}. Desired lead time: {{item.lead_time}} day(s). Item criticality: {{item.criticidade}}."}},

    {"codigo":"observacoes","nome":"Observações","ordem":60,"obrig":false,
     "pt":{"titulo":"Observações","texto":"{{item.observacoes}}"},
     "es":{"titulo":"Observaciones","texto":"{{item.observacoes}}"},
     "en":{"titulo":"Remarks","texto":"{{item.observacoes}}"}},

    {"codigo":"encerramento","nome":"Encerramento","ordem":90,"obrig":true,
     "pt":{"titulo":"Aguardamos seu retorno","texto":"Ficamos no aguardo de sua proposta comercial. Em caso de dúvidas técnicas ou comerciais, favor contatar {{compras.responsavel}}.\n\nAtenciosamente,\n{{compras.responsavel}}"},
     "es":{"titulo":"Aguardamos su respuesta","texto":"Quedamos a la espera de su propuesta comercial. Ante dudas técnicas o comerciales, favor contactar a {{compras.responsavel}}.\n\nCordialmente,\n{{compras.responsavel}}"},
     "en":{"titulo":"Looking forward","texto":"We look forward to your commercial proposal. For technical or commercial questions, please contact {{compras.responsavel}}.\n\nBest regards,\n{{compras.responsavel}}"}}
  ]
  $json$::jsonb;
  v_item jsonb;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_blocos)
  LOOP
    INSERT INTO public.documento_blocos
      (tipo_codigo, codigo, nome, ordem_padrao, obrigatorio,
       conteudo_pt, conteudo_es, conteudo_en, variaveis_obrigatorias, ativo)
    VALUES
      ('solicitacao_cotacao',
       v_item->>'codigo',
       v_item->>'nome',
       COALESCE((v_item->>'ordem')::int, 0),
       COALESCE((v_item->>'obrig')::boolean, false),
       COALESCE(v_item->'pt', '{}'::jsonb),
       COALESCE(v_item->'es', '{}'::jsonb),
       COALESCE(v_item->'en', '{}'::jsonb),
       ARRAY[]::text[],
       true)
    ON CONFLICT (tipo_codigo, codigo) DO UPDATE
      SET nome = EXCLUDED.nome,
          ordem_padrao = EXCLUDED.ordem_padrao,
          obrigatorio = EXCLUDED.obrigatorio,
          conteudo_pt = CASE
            WHEN (documento_blocos.conteudo_pt = '{}'::jsonb OR documento_blocos.conteudo_pt IS NULL)
            THEN EXCLUDED.conteudo_pt
            ELSE documento_blocos.conteudo_pt
          END,
          conteudo_es = CASE
            WHEN (documento_blocos.conteudo_es = '{}'::jsonb OR documento_blocos.conteudo_es IS NULL)
            THEN EXCLUDED.conteudo_es
            ELSE documento_blocos.conteudo_es
          END,
          conteudo_en = CASE
            WHEN (documento_blocos.conteudo_en = '{}'::jsonb OR documento_blocos.conteudo_en IS NULL)
            THEN EXCLUDED.conteudo_en
            ELSE documento_blocos.conteudo_en
          END,
          updated_at = now();
  END LOOP;
END $$;
