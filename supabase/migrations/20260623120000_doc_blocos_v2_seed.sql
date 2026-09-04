-- =============================================================
-- Documentos V2: histórico de blocos + tipos FAT/SAT + seed
-- Aplicar via SQL Editor do Supabase (one-shot, idempotente)
-- =============================================================

-- 1) Tabela de versões dos blocos
CREATE TABLE IF NOT EXISTS public.documento_bloco_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bloco_id uuid NOT NULL REFERENCES public.documento_blocos(id) ON DELETE CASCADE,
  tipo_codigo text NOT NULL,
  versao_seq int NOT NULL,
  conteudo_pt jsonb NOT NULL DEFAULT '{}'::jsonb,
  conteudo_es jsonb NOT NULL DEFAULT '{}'::jsonb,
  conteudo_en jsonb NOT NULL DEFAULT '{}'::jsonb,
  obrigatorio boolean NOT NULL DEFAULT false,
  ordem_padrao int NOT NULL DEFAULT 0,
  alterado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  alterado_por_nome text,
  comentario text,
  acao text NOT NULL DEFAULT 'editado',
  restaurado_de uuid REFERENCES public.documento_bloco_versoes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bloco_id, versao_seq)
);

GRANT SELECT, INSERT ON public.documento_bloco_versoes TO authenticated;
GRANT ALL ON public.documento_bloco_versoes TO service_role;

ALTER TABLE public.documento_bloco_versoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin/Manager leem histórico" ON public.documento_bloco_versoes;
CREATE POLICY "Admin/Manager leem histórico"
  ON public.documento_bloco_versoes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Admin insere histórico" ON public.documento_bloco_versoes;
CREATE POLICY "Admin insere histórico"
  ON public.documento_bloco_versoes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_doc_bloco_versoes_bloco
  ON public.documento_bloco_versoes (bloco_id, versao_seq DESC);

-- 2) Unique (tipo_codigo, codigo) em documento_blocos
DO $$ BEGIN
  ALTER TABLE public.documento_blocos
    ADD CONSTRAINT documento_blocos_tipo_codigo_unq UNIQUE (tipo_codigo, codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3) Tipos FAT/SAT
INSERT INTO public.documento_tipos (codigo, nome, prefixo_codigo, ativo)
VALUES ('fat_report','Relatório FAT','FAT',true)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.documento_tipos (codigo, nome, prefixo_codigo, ativo)
VALUES ('sat_report','Relatório SAT','SAT',true)
ON CONFLICT (codigo) DO NOTHING;

-- 4) Seed/atualização de blocos default (preserva conteúdo já editado)
DO $$
DECLARE
  v_blocos jsonb := $json$
  [
    {"tipo":"orcamento","codigo":"apresentacao","nome":"Apresentação / Saudação","ordem":10,"obrig":true,
     "pt":{"titulo":"Apresentação","texto":"Caros {{cliente.contato}},\n\nAtendendo à sua solicitação, apresentamos abaixo as nossas condições para o fornecimento de {{escopo}}, conforme segue."}},
    {"tipo":"orcamento","codigo":"descricao_tecnica","nome":"Descrição Técnica do Produto","ordem":20,"obrig":true,
     "pt":{"titulo":"Descrição Técnica do Produto","texto":"Descrição completa do escopo técnico do fornecimento, incluindo características de processo, capacidades nominais, materiais em contato com o produto e principais subconjuntos."}},
    {"tipo":"orcamento","codigo":"valores_projeto","nome":"Valores do Projeto","ordem":30,"obrig":true,
     "pt":{"titulo":"Valores do Projeto","texto":"Tabela de itens com quantidade, valor unitário e valor total. Subtotais para Embalagem, Custos de Origem, Horas Técnicas, Frete e Seguro Internacional. Total geral em {{moeda}}."}},
    {"tipo":"orcamento","codigo":"opcionais_projeto","nome":"Opcionais do Projeto","ordem":40,"obrig":false,
     "pt":{"titulo":"Opcionais do Projeto","texto":"Itens opcionais não inclusos no escopo padrão, com valor unitário e total separados do subtotal principal."}},
    {"tipo":"orcamento","codigo":"cond_pagamento","nome":"Condições de Pagamento","ordem":50,"obrig":true,
     "pt":{"titulo":"Condições de Pagamento","texto":"Forma de pagamento: {{pagamento.forma}}.\nParcelamento: {{pagamento.parcelas}}.\nDetalhamento das parcelas com valor, percentual e descrição."}},
    {"tipo":"orcamento","codigo":"prazo_entrega","nome":"Prazo de Entrega","ordem":60,"obrig":true,
     "pt":{"titulo":"Prazo de Entrega","texto":"Prazo estimado de entrega a partir da assinatura do contrato e do recebimento do sinal: {{prazo.semanas}} semanas."}},
    {"tipo":"orcamento","codigo":"treinamento","nome":"Treinamento","ordem":70,"obrig":false,
     "pt":{"titulo":"Treinamento","texto":"Treinamento prático de operação será realizado durante a visita técnica para instalação e partida do equipamento adquirido, na planta do cliente."}},
    {"tipo":"orcamento","codigo":"embalagem","nome":"Embalagem","ordem":80,"obrig":false,
     "pt":{"titulo":"Embalagem","texto":"Embalagens de madeira certificada e tratada de acordo com a ISPM 15 (International Standards for Phytosanitary Measures), para viabilizar o processo de exportação."}},
    {"tipo":"orcamento","codigo":"frete_embarque","nome":"Frete / Embarque","ordem":90,"obrig":false,
     "pt":{"titulo":"Frete / Embarque","texto":"Incoterm: {{frete.incoterm}}.\nDescrição: {{frete.descricao}}."}},
    {"tipo":"orcamento","codigo":"nao_incluso","nome":"Não Incluso no Fornecimento","ordem":100,"obrig":false,
     "pt":{"titulo":"Não Incluso no Fornecimento","texto":"• Serviços públicos em geral.\n• Serviços elétricos em geral.\n• Montagem e ferramentas necessárias para montagem.\n• Linhas de distribuição de eletricidade e ar comprimido.\n• Peças de reposição (salvo indicação em contrário).\n• Modificações ou adaptações em equipamentos existentes.\n• Produto específico para teste, calibração e comissionamento.\n• Suprimentos básicos para teste, calibração e comissionamento.\n• Serviços de movimentação dos equipamentos."}},
    {"tipo":"orcamento","codigo":"fat_clausula","nome":"FAT — Cláusula","ordem":110,"obrig":true,
     "pt":{"titulo":"FAT — Teste de Aceitação de Fábrica","texto":"Assim que o equipamento estiver pronto na fábrica, será testado na presença do cliente. Todas as funções e componentes do sistema serão testados conforme acordo prévio; os resultados são registrados por escrito e assinados por ambas as partes.\n\n• Custos pessoais do cliente para o FAT e demais visitas de inspeção são de responsabilidade do cliente.\n• Estão inclusos 3 (três) dias de FAT para teste de dois formatos (produto menor e principal). Tempo adicional por motivos não imputáveis à fornecedora será cobrado separadamente.\n• O cliente deve entregar na planta, em caráter DDP (Incoterm 2010), todos os materiais e insumos necessários para os testes.\n• Acessórios específicos da aplicação (aquecimento, elevadores, etc.) serão orçados separadamente."}},
    {"tipo":"orcamento","codigo":"sat_clausula","nome":"SAT — Cláusula","ordem":120,"obrig":true,
     "pt":{"titulo":"SAT — Teste de Aceitação no Local","texto":"Concluída a instalação e os testes iniciais, os equipamentos serão submetidos a uma produção de aceitação, na qual os valores objetivo acordados devem ser atingidos. O tempo de teste é limitado a 4 horas por formato.\n\nA aceitação será considerada completa nos seguintes casos:\n• Se os testes de aceitação não forem realizados em 1 mês após a instalação por motivos alheios à fornecedora.\n• A partir do momento em que o equipamento for utilizado para produção."},
     "es":{"titulo":"SAT — Prueba de Aceptación en Sitio","texto":"Una vez finalizada la instalación y las pruebas iniciales, los equipos serán probados en una producción de aceptación, cuando los valores objetivo acordados deberán ser alcanzados. El tiempo de pruebas será limitado a 4 horas para cada formato.\n\nLa aceptación se considerará completa en los siguientes casos:\n• Si las pruebas de aceptación no se realizan dentro de 1 mes después de la instalación por motivos ajenos a la proveedora.\n• Una vez que los equipos se utilizan para la producción."}},
    {"tipo":"orcamento","codigo":"informacoes_gerais","nome":"Informações Gerais","ordem":130,"obrig":false,
     "pt":{"titulo":"Informações Gerais","texto":"• Alimentação 380V (outras tensões sob consulta) x 3 fases + 220V Monofásico x 50/60 Hz. Tensão e frequência confirmadas com a engenharia.\n• Reguladores de tensão especiais, se necessários, são cobrados mediante autorização prévia.\n• Alimentação pneumática mínima de 6 bar contínua e estável, DRY Air (isento de água e óleo).\n• Máquinas projetadas para operação com temperatura ambiente < 35°C, salvo previsão de ar condicionado no quadro.\n• Partes em contato com o produto em aço inox ou material sintético atóxico.\n• Pintura RAL 7024 ou aço inox escovado. Pinturas especiais sob consulta.\n• Sem aderência ATEX, salvo indicação em contrário.\n• Equipamentos atendem à NR-10."}},
    {"tipo":"orcamento","codigo":"validade_oferta","nome":"Validade da Oferta","ordem":140,"obrig":true,
     "pt":{"titulo":"Validade da Oferta","texto":"{{validade.dias}} dias a partir da data de emissão."}},
    {"tipo":"orcamento","codigo":"encerramento_assinatura","nome":"Encerramento / Assinatura","ordem":150,"obrig":true,
     "pt":{"titulo":"Encerramento","texto":"Agradecemos a oportunidade de enviar nossa cotação para o seu projeto e esperamos que nossa proposta atenda às suas necessidades e requisitos de produção. Permanecemos à disposição para quaisquer dúvidas.\n\nSaudações cordiais,\n\n{{responsavel.nome}}\n{{responsavel.cargo}}\nTel.: {{responsavel.telefone}}\nE-mail: {{responsavel.email}}"}},

    {"tipo":"fat_report","codigo":"intro_fat","nome":"Introdução do FAT","ordem":10,"obrig":false,
     "pt":{"titulo":"Apresentação","texto":"Este relatório registra o Teste de Aceitação de Fábrica (FAT) realizado em conformidade com o escopo contratual e o protocolo previamente acordado entre as partes."}},
    {"tipo":"fat_report","codigo":"criterios_aceite_default","nome":"Critérios de Aceitação (default)","ordem":20,"obrig":false,
     "pt":{"titulo":"Critérios de Aceitação","texto":"São considerados aprovados os ensaios cujos resultados medidos atendam às tolerâncias nominais previstas em protocolo, com no mínimo 95% dos itens classificados como OK e nenhum item crítico em NOK."}},
    {"tipo":"fat_report","codigo":"legenda_assinaturas","nome":"Legenda das Assinaturas","ordem":80,"obrig":false,
     "pt":{"titulo":"Legenda","texto":"A assinatura do Inspetor atesta a execução dos ensaios conforme protocolo. A assinatura do Cliente / Testemunha atesta o acompanhamento e a homologação dos resultados."}},
    {"tipo":"fat_report","codigo":"rodape_legal","nome":"Rodapé Legal","ordem":90,"obrig":false,
     "pt":{"titulo":"Rodapé Legal","texto":"Documento gerado eletronicamente. A integridade pode ser verificada pela trilha de auditoria e pela assinatura HMAC registradas na plataforma."}},

    {"tipo":"sat_report","codigo":"intro_sat","nome":"Introdução do SAT","ordem":10,"obrig":false,
     "pt":{"titulo":"Apresentação","texto":"Este relatório registra o Teste de Aceitação no Local (SAT) realizado na planta do cliente, em conformidade com o escopo contratual e o protocolo acordado."}},
    {"tipo":"sat_report","codigo":"legenda_assinaturas","nome":"Legenda das Assinaturas","ordem":80,"obrig":false,
     "pt":{"titulo":"Legenda","texto":"A assinatura do Técnico atesta a execução dos serviços. A assinatura do Cliente atesta a conformidade e a homologação dos resultados."}},
    {"tipo":"sat_report","codigo":"rodape_legal","nome":"Rodapé Legal","ordem":90,"obrig":false,
     "pt":{"titulo":"Rodapé Legal","texto":"Documento gerado eletronicamente. A integridade pode ser verificada pela trilha de auditoria e pela assinatura HMAC registradas na plataforma."}}
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
      (v_item->>'tipo',
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
