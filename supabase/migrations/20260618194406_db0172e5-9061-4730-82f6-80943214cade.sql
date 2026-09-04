
ALTER TABLE public.cliente_equipamentos
  ALTER COLUMN status SET DEFAULT 'planejamento';

DO $$ BEGIN
  CREATE TYPE public.equipamento_doc_categoria AS ENUM
    ('etp','manual_mecanico','manual_eletrico','ficha_tecnica','fat','montagem','desenho','lista_pecas','certificado','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.cliente_equipamento_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.cliente_equipamentos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  processo_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  categoria public.equipamento_doc_categoria NOT NULL DEFAULT 'outro',
  nome_final text NOT NULL,
  nome_original text NOT NULL,
  mime_type text NOT NULL,
  tamanho_bytes bigint NOT NULL,
  drive_file_id text,
  drive_view_url text,
  drive_folder_id text,
  versao text,
  observacoes text,
  user_id uuid,
  user_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid
);

CREATE INDEX IF NOT EXISTS idx_eqp_docs_equipamento ON public.cliente_equipamento_documentos(equipamento_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_eqp_docs_cliente ON public.cliente_equipamento_documentos(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_eqp_docs_categoria ON public.cliente_equipamento_documentos(categoria) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_equipamento_documentos TO authenticated;
GRANT ALL ON public.cliente_equipamento_documentos TO service_role;

ALTER TABLE public.cliente_equipamento_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eqp_docs_select" ON public.cliente_equipamento_documentos
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_cliente(cliente_id));

CREATE POLICY "eqp_docs_insert" ON public.cliente_equipamento_documentos
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_cliente(cliente_id));

CREATE POLICY "eqp_docs_update" ON public.cliente_equipamento_documentos
  FOR UPDATE TO authenticated
  USING (public.can_access_cliente(cliente_id))
  WITH CHECK (public.can_access_cliente(cliente_id));

CREATE TRIGGER trg_eqp_docs_set_updated_at
  BEFORE UPDATE ON public.cliente_equipamento_documentos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
