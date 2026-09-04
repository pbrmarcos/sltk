
-- ========== ENUMS ==========
DO $$ BEGIN
  CREATE TYPE public.sat_item_tipo AS ENUM (
    'sim_nao_comentario',
    'texto',
    'numero',
    'data',
    'checkbox_multi',
    'parametro_operacional',
    'cabecalho'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sat_relatorio_status AS ENUM (
    'rascunho',
    'preenchendo',
    'assinado',
    'arquivado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========== SEQUÊNCIAS ==========
CREATE SEQUENCE IF NOT EXISTS public.sat_template_versao_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.sat_relatorio_codigo_seq START 1;

-- ========== TABELA: sat_template ==========
CREATE TABLE IF NOT EXISTS public.sat_template (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  versao INTEGER NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT false,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  UNIQUE (versao)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sat_template TO authenticated;
GRANT ALL ON public.sat_template TO service_role;

ALTER TABLE public.sat_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sat_template_select_auth" ON public.sat_template
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sat_template_insert_admin" ON public.sat_template
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "sat_template_update_admin" ON public.sat_template
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "sat_template_delete_admin" ON public.sat_template
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger: garante único ativo
CREATE OR REPLACE FUNCTION public.tg_sat_template_set_ativo()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ativo IS TRUE THEN
    UPDATE public.sat_template
       SET ativo = false, updated_at = now()
     WHERE id <> NEW.id AND ativo = true;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sat_template_before_iu ON public.sat_template;
CREATE TRIGGER sat_template_before_iu
  BEFORE INSERT OR UPDATE ON public.sat_template
  FOR EACH ROW EXECUTE FUNCTION public.tg_sat_template_set_ativo();

-- ========== TABELA: sat_template_secao ==========
CREATE TABLE IF NOT EXISTS public.sat_template_secao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.sat_template(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  titulo TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sat_template_secao TO authenticated;
GRANT ALL ON public.sat_template_secao TO service_role;

ALTER TABLE public.sat_template_secao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sat_template_secao_select_auth" ON public.sat_template_secao
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sat_template_secao_write_admin" ON public.sat_template_secao
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE INDEX IF NOT EXISTS sat_template_secao_template_idx
  ON public.sat_template_secao(template_id, ordem);

-- ========== TABELA: sat_template_item ==========
CREATE TABLE IF NOT EXISTS public.sat_template_item (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  secao_id UUID NOT NULL REFERENCES public.sat_template_secao(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  tipo public.sat_item_tipo NOT NULL DEFAULT 'sim_nao_comentario',
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  permite_anexo BOOLEAN NOT NULL DEFAULT true,
  ajuda TEXT,
  opcoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sat_template_item TO authenticated;
GRANT ALL ON public.sat_template_item TO service_role;

ALTER TABLE public.sat_template_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sat_template_item_select_auth" ON public.sat_template_item
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sat_template_item_write_admin" ON public.sat_template_item
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE INDEX IF NOT EXISTS sat_template_item_secao_idx
  ON public.sat_template_item(secao_id, ordem);

-- ========== TABELA: sat_relatorio ==========
CREATE TABLE IF NOT EXISTS public.sat_relatorio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id),
  processo_id UUID REFERENCES public.processos(id),
  equipamento_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  template_id UUID NOT NULL REFERENCES public.sat_template(id),
  template_versao INTEGER NOT NULL,
  status public.sat_relatorio_status NOT NULL DEFAULT 'rascunho',
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  tecnicos JSONB NOT NULL DEFAULT '[]'::jsonb,
  tecnico_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  periodo_de DATE,
  periodo_ate DATE,
  local_endereco TEXT,
  motivos_viagem TEXT[] NOT NULL DEFAULT '{}'::text[],
  pdf_drive_file_id TEXT,
  pdf_drive_view_url TEXT,
  pdf_status TEXT,
  pdf_gerado_em TIMESTAMPTZ,
  drive_folder_id TEXT,
  assinatura_cliente JSONB,
  assinatura_tecnico JSONB,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sat_relatorio TO authenticated;
GRANT ALL ON public.sat_relatorio TO service_role;

ALTER TABLE public.sat_relatorio ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_sat_relatorio(_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sat_relatorio s
    WHERE s.id = _id
      AND s.deleted_at IS NULL
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'manager'::app_role)
        OR s.created_by = auth.uid()
        OR auth.uid() = ANY(s.tecnico_ids)
      )
  )
$$;

CREATE POLICY "sat_relatorio_select" ON public.sat_relatorio
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR created_by = auth.uid()
      OR auth.uid() = ANY(tecnico_ids)
    )
  );

CREATE POLICY "sat_relatorio_insert" ON public.sat_relatorio
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR public.has_role(auth.uid(), 'field'::app_role)
      OR public.has_role(auth.uid(), 'engineer'::app_role)
      OR public.has_role(auth.uid(), 'assembly'::app_role)
    )
  );

CREATE POLICY "sat_relatorio_update" ON public.sat_relatorio
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR created_by = auth.uid()
    OR auth.uid() = ANY(tecnico_ids)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR created_by = auth.uid()
    OR auth.uid() = ANY(tecnico_ids)
  );

CREATE POLICY "sat_relatorio_delete_admin" ON public.sat_relatorio
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger: codigo + updated_by
CREATE OR REPLACE FUNCTION public.tg_sat_relatorio_set_codigo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'SAT-' || to_char(now(),'YYYY') || '-'
      || lpad(nextval('public.sat_relatorio_codigo_seq')::text, 4, '0');
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.tg_sat_relatorio_set_updated()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sat_relatorio_before_insert ON public.sat_relatorio;
CREATE TRIGGER sat_relatorio_before_insert
  BEFORE INSERT ON public.sat_relatorio
  FOR EACH ROW EXECUTE FUNCTION public.tg_sat_relatorio_set_codigo();

DROP TRIGGER IF EXISTS sat_relatorio_before_update ON public.sat_relatorio;
CREATE TRIGGER sat_relatorio_before_update
  BEFORE UPDATE ON public.sat_relatorio
  FOR EACH ROW EXECUTE FUNCTION public.tg_sat_relatorio_set_updated();

-- Audit
CREATE OR REPLACE FUNCTION public.tg_sat_relatorio_audit()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE col text;
  cols text[] := ARRAY['status','cliente_id','processo_id','periodo_de','periodo_ate','dados','pdf_drive_view_url','deleted_at'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, new_value)
    VALUES (auth.uid(), 'sat_relatorio', NEW.id::text, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    FOREACH col IN ARRAY cols LOOP
      IF to_jsonb(NEW)->col IS DISTINCT FROM to_jsonb(OLD)->col THEN
        INSERT INTO public.audit_log (user_id, table_name, record_id, action, field_changed, old_value, new_value)
        VALUES (auth.uid(), 'sat_relatorio', NEW.id::text, 'UPDATE', col, to_jsonb(OLD)->col, to_jsonb(NEW)->col);
      END IF;
    END LOOP;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, old_value)
    VALUES (auth.uid(), 'sat_relatorio', OLD.id::text, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS sat_relatorio_audit ON public.sat_relatorio;
CREATE TRIGGER sat_relatorio_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.sat_relatorio
  FOR EACH ROW EXECUTE FUNCTION public.tg_sat_relatorio_audit();

CREATE INDEX IF NOT EXISTS sat_relatorio_cliente_idx ON public.sat_relatorio(cliente_id);
CREATE INDEX IF NOT EXISTS sat_relatorio_processo_idx ON public.sat_relatorio(processo_id);
CREATE INDEX IF NOT EXISTS sat_relatorio_status_idx ON public.sat_relatorio(status);
CREATE INDEX IF NOT EXISTS sat_relatorio_tecnico_idx ON public.sat_relatorio USING GIN(tecnico_ids);

-- ========== TABELA: sat_relatorio_anexo ==========
CREATE TABLE IF NOT EXISTS public.sat_relatorio_anexo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  relatorio_id UUID NOT NULL REFERENCES public.sat_relatorio(id) ON DELETE CASCADE,
  item_id TEXT,
  secao_id TEXT,
  tipo_anexo TEXT NOT NULL DEFAULT 'item',
  drive_file_id TEXT NOT NULL,
  drive_view_url TEXT NOT NULL,
  drive_folder_id TEXT,
  nome_original TEXT NOT NULL,
  nome_final TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  tamanho_bytes BIGINT NOT NULL,
  descricao TEXT,
  user_id UUID,
  user_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sat_relatorio_anexo TO authenticated;
GRANT ALL ON public.sat_relatorio_anexo TO service_role;

ALTER TABLE public.sat_relatorio_anexo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sat_anexo_select" ON public.sat_relatorio_anexo
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_sat_relatorio(relatorio_id));

CREATE POLICY "sat_anexo_insert" ON public.sat_relatorio_anexo
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_sat_relatorio(relatorio_id));

CREATE POLICY "sat_anexo_update" ON public.sat_relatorio_anexo
  FOR UPDATE TO authenticated
  USING (public.can_access_sat_relatorio(relatorio_id))
  WITH CHECK (public.can_access_sat_relatorio(relatorio_id));

CREATE POLICY "sat_anexo_delete" ON public.sat_relatorio_anexo
  FOR DELETE TO authenticated
  USING (public.can_access_sat_relatorio(relatorio_id));

CREATE INDEX IF NOT EXISTS sat_anexo_relatorio_idx ON public.sat_relatorio_anexo(relatorio_id);
CREATE INDEX IF NOT EXISTS sat_anexo_item_idx ON public.sat_relatorio_anexo(relatorio_id, item_id);

-- ========== SEED: template SAT padrão (versão 1, ativo) ==========
DO $$
DECLARE
  v_template_id UUID;
  v_secao_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sat_template WHERE versao = 1) THEN
    INSERT INTO public.sat_template (nome, versao, ativo, descricao)
    VALUES ('SAT — Relatório de Atendimento Técnico', 1, true,
            'Modelo padrão para relatórios de atendimento técnico em campo')
    RETURNING id INTO v_template_id;

    -- Seção 1: Identificação
    INSERT INTO public.sat_template_secao (template_id, ordem, titulo)
    VALUES (v_template_id, 1, 'Identificação') RETURNING id INTO v_secao_id;
    INSERT INTO public.sat_template_item (secao_id, ordem, label, tipo, obrigatorio, permite_anexo) VALUES
      (v_secao_id, 1, 'Cliente', 'texto', true, false),
      (v_secao_id, 2, 'Data', 'data', true, false),
      (v_secao_id, 3, 'Logradouro', 'texto', false, false),
      (v_secao_id, 4, 'Telefone', 'texto', false, false),
      (v_secao_id, 5, 'Cidade', 'texto', false, false),
      (v_secao_id, 6, 'Estado', 'texto', false, false),
      (v_secao_id, 7, 'País', 'texto', false, false),
      (v_secao_id, 8, 'Pessoa para contato', 'texto', false, false),
      (v_secao_id, 9, 'Telefone do contato', 'texto', false, false),
      (v_secao_id, 10, 'Equipamento(s)', 'texto', true, false),
      (v_secao_id, 11, 'Nº(s) de Série', 'texto', false, false);

    -- Seção 2: Motivo da viagem
    INSERT INTO public.sat_template_secao (template_id, ordem, titulo, descricao)
    VALUES (v_template_id, 2, 'Motivo da viagem', 'Marque todos os motivos que se aplicam')
    RETURNING id INTO v_secao_id;
    INSERT INTO public.sat_template_item (secao_id, ordem, label, tipo, obrigatorio, permite_anexo, opcoes) VALUES
      (v_secao_id, 1, 'Motivos', 'checkbox_multi', true, false,
       '["Cortesia","Fora de garantia","Manutenção preventiva","Montagem","Treinamento","Manutenção corretiva","Instrução de operação de máquina","Garantia"]'::jsonb);

    -- Seção 3: Equipe e período
    INSERT INTO public.sat_template_secao (template_id, ordem, titulo)
    VALUES (v_template_id, 3, 'Equipe e período') RETURNING id INTO v_secao_id;
    INSERT INTO public.sat_template_item (secao_id, ordem, label, tipo, obrigatorio, permite_anexo) VALUES
      (v_secao_id, 1, 'Técnico(s)', 'texto', true, false),
      (v_secao_id, 2, 'Período da viagem - De', 'data', true, false),
      (v_secao_id, 3, 'Período da viagem - Até', 'data', true, false),
      (v_secao_id, 4, 'Local / Endereço da fábrica', 'texto', false, false);

    -- Seção 4: Inspeção de Documentação - Segurança
    INSERT INTO public.sat_template_secao (template_id, ordem, titulo, descricao)
    VALUES (v_template_id, 4, 'Inspeção de Documentação — Segurança', 'Verificações de segurança do equipamento')
    RETURNING id INTO v_secao_id;
    INSERT INTO public.sat_template_item (secao_id, ordem, label, tipo, obrigatorio, permite_anexo) VALUES
      (v_secao_id, 1, 'O equipamento apresenta algum risco?', 'sim_nao_comentario', true, true),
      (v_secao_id, 2, 'Lista de normas de segurança aplicadas ao equipamento (Normativa CE, NR, etc.)', 'sim_nao_comentario', true, true);

    -- Seção 5: Manuais
    INSERT INTO public.sat_template_secao (template_id, ordem, titulo)
    VALUES (v_template_id, 5, 'Inspeção de Documentação — Manuais')
    RETURNING id INTO v_secao_id;
    INSERT INTO public.sat_template_item (secao_id, ordem, label, tipo, obrigatorio, permite_anexo) VALUES
      (v_secao_id, 1, 'Desenhos elétricos', 'sim_nao_comentario', false, true),
      (v_secao_id, 2, 'Manual de Operação e Manutenção', 'sim_nao_comentario', false, true),
      (v_secao_id, 3, 'Cópia digital de todos os manuais (operacional, manutenção, lista de peças, desenho elétrico)', 'sim_nao_comentario', false, true),
      (v_secao_id, 4, 'Requisitos de ar e elétricos para a instalação', 'sim_nao_comentario', false, true),
      (v_secao_id, 5, 'Lista de materiais com números de peças OEM', 'sim_nao_comentario', false, true),
      (v_secao_id, 6, 'Diagrama pneumático', 'sim_nao_comentario', false, true);

    -- Seção 6: Educação e Treinamento
    INSERT INTO public.sat_template_secao (template_id, ordem, titulo)
    VALUES (v_template_id, 6, 'Educação e Treinamento')
    RETURNING id INTO v_secao_id;
    INSERT INTO public.sat_template_item (secao_id, ordem, label, tipo, obrigatorio, permite_anexo) VALUES
      (v_secao_id, 1, 'Datas dos treinamentos e nomes das pessoas treinadas', 'sim_nao_comentario', false, true),
      (v_secao_id, 2, 'Operadores e equipes de manutenção foram treinados', 'sim_nao_comentario', false, true);

    -- Seção 7: Envio
    INSERT INTO public.sat_template_secao (template_id, ordem, titulo)
    VALUES (v_template_id, 7, 'Envio')
    RETURNING id INTO v_secao_id;
    INSERT INTO public.sat_template_item (secao_id, ordem, label, tipo, obrigatorio, permite_anexo) VALUES
      (v_secao_id, 1, 'O equipamento chegou em bom estado?', 'sim_nao_comentario', true, true),
      (v_secao_id, 2, 'Instruções para Movimentação e Recebimento do equipamento', 'sim_nao_comentario', false, true);

    -- Seção 8: Teste de Desempenho - Operação
    INSERT INTO public.sat_template_secao (template_id, ordem, titulo, descricao)
    VALUES (v_template_id, 8, 'Teste de Desempenho — Operação',
            'Realize um teste de desempenho na velocidade nominal e registre os resultados')
    RETURNING id INTO v_secao_id;
    INSERT INTO public.sat_template_item (secao_id, ordem, label, tipo, obrigatorio, permite_anexo) VALUES
      (v_secao_id, 1, 'Teste de desempenho realizado na velocidade nominal', 'sim_nao_comentario', true, true),
      (v_secao_id, 2, 'Velocidade nominal da máquina', 'texto', false, true),
      (v_secao_id, 3, 'Eficiência real da máquina (%)', 'numero', false, true),
      (v_secao_id, 4, 'Rendimento real da máquina (%)', 'numero', false, true),
      (v_secao_id, 5, 'Tempo total de inatividade (%)', 'numero', false, true),
      (v_secao_id, 6, 'Confiabilidade técnica', 'texto', false, true),
      (v_secao_id, 7, 'Parâmetros da máquina usados no teste (temperatura, velocidades, pressões, etc.)', 'texto', false, true),
      (v_secao_id, 8, 'Foi realizada troca entre formatos e tempo registrado?', 'sim_nao_comentario', false, true),
      (v_secao_id, 9, 'Tempo de troca de formato A (min)', 'numero', false, true),
      (v_secao_id, 10, 'Tempo de troca de formato B (min)', 'numero', false, true),
      (v_secao_id, 11, 'Tempo de troca de formato C (min)', 'numero', false, true);

    -- Seção 9: Teste de Desempenho - Qualidade
    INSERT INTO public.sat_template_secao (template_id, ordem, titulo, descricao)
    VALUES (v_template_id, 9, 'Teste de Desempenho — Qualidade',
            'Avaliação de qualidade das amostras (selo, peso líquido, dimensões etc.)')
    RETURNING id INTO v_secao_id;
    INSERT INTO public.sat_template_item (secao_id, ordem, label, tipo, obrigatorio, permite_anexo) VALUES
      (v_secao_id, 1, 'Distribuição de plástico', 'sim_nao_comentario', false, true),
      (v_secao_id, 2, 'Dimensões', 'sim_nao_comentario', false, true),
      (v_secao_id, 3, 'Selagem', 'sim_nao_comentario', false, true),
      (v_secao_id, 4, 'Aparência', 'sim_nao_comentario', false, true),
      (v_secao_id, 5, 'Desempenho de qualidade (%)', 'numero', false, true);

    -- Seção 10: Quadro de parâmetros operacionais
    INSERT INTO public.sat_template_secao (template_id, ordem, titulo, descricao)
    VALUES (v_template_id, 10, 'Quadro de parâmetros operacionais',
            'Parâmetros operacionais registrados durante o atendimento')
    RETURNING id INTO v_secao_id;
    INSERT INTO public.sat_template_item (secao_id, ordem, label, tipo, obrigatorio, permite_anexo) VALUES
      (v_secao_id, 1, 'Parâmetros registrados', 'parametro_operacional', false, true);
  END IF;
END $$;
