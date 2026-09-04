-- =============================================================
-- RFQ público: staging de submissão + anexos.
-- Permite ao formulário público criar uma submissão em rascunho
-- (para receber uploads de PDF/JPG/PNG) e, no submit final,
-- atualizar essa submissão com respostas e contato.
-- =============================================================

-- Colunas complementares de anexo (mantém compatibilidade)
ALTER TABLE public.rfq_submissao_anexo
  ADD COLUMN IF NOT EXISTS nome_original text,
  ADD COLUMN IF NOT EXISTS drive_folder_id text;

-- Permitir anon atualizar a submissão-rascunho enquanto o link estiver aberto
GRANT UPDATE ON public.rfq_submissao TO anon;

DROP POLICY IF EXISTS rfs_upd_anon ON public.rfq_submissao;
CREATE POLICY rfs_upd_anon
  ON public.rfq_submissao
  FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.rfq_formulario_link l
      WHERE l.id = rfq_submissao.link_id
        AND l.status = 'aberto'
        AND (l.expira_em IS NULL OR l.expira_em > now())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rfq_formulario_link l
      WHERE l.id = rfq_submissao.link_id
        AND l.cliente_id = rfq_submissao.cliente_id
        AND l.tipo_id = rfq_submissao.tipo_id
        AND l.status = 'aberto'
        AND (l.expira_em IS NULL OR l.expira_em > now())
    )
  );

-- Ajuste na policy de INSERT de anexos: aceitar link "aberto" com submissao_id
-- casando com a submissão-rascunho (fluxo de upload durante preenchimento).
DROP POLICY IF EXISTS rfsa_ins_anon ON public.rfq_submissao_anexo;
CREATE POLICY rfsa_ins_anon
  ON public.rfq_submissao_anexo
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.rfq_submissao s
      JOIN public.rfq_formulario_link l ON l.id = s.link_id
      WHERE s.id = rfq_submissao_anexo.submissao_id
        AND l.submissao_id = s.id
        AND l.status IN ('aberto','preenchido')
        AND (l.expira_em IS NULL OR l.expira_em > now())
    )
  );
