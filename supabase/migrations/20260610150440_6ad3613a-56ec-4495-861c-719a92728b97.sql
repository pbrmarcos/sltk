
-- Sequence para código de cliente
CREATE SEQUENCE public.clientes_codigo_seq START 1;

CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  razao_social text NOT NULL,
  nome_fantasia text,
  pais char(2) NOT NULL REFERENCES public.paises_config(codigo),
  documento_fiscal_tipo text NOT NULL,
  documento_fiscal_numero text NOT NULL,
  inscricao_estadual text,
  moeda char(3) NOT NULL,
  idioma text NOT NULL DEFAULT 'pt' CHECK (idioma IN ('pt','es','en')),
  status text NOT NULL DEFAULT 'prospect' CHECK (status IN ('ativo','inativo','prospect')),
  segmento text,
  key_account boolean NOT NULL DEFAULT false,
  observacoes text,
  endereco_logradouro text,
  endereco_numero text,
  endereco_complemento text,
  endereco_bairro text,
  endereco_cidade text,
  endereco_estado text,
  endereco_codigo_postal text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX clientes_pais_documento_unique
  ON public.clientes (pais, documento_fiscal_numero)
  WHERE deleted_at IS NULL;

CREATE INDEX clientes_status_idx ON public.clientes (status) WHERE deleted_at IS NULL;
CREATE INDEX clientes_razao_social_idx ON public.clientes (razao_social text_pattern_ops) WHERE deleted_at IS NULL;
CREATE INDEX clientes_pais_idx ON public.clientes (pais) WHERE deleted_at IS NULL;

-- Trigger updated_at
CREATE TRIGGER clientes_set_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Trigger para gerar código automático
CREATE OR REPLACE FUNCTION public.tg_clientes_set_codigo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'CLI-' || lpad(nextval('public.clientes_codigo_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER clientes_set_codigo
  BEFORE INSERT ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.tg_clientes_set_codigo();

GRANT SELECT, INSERT, UPDATE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
GRANT USAGE ON SEQUENCE public.clientes_codigo_seq TO authenticated, service_role;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY clientes_select_auth ON public.clientes
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY clientes_insert_roles ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
  );

CREATE POLICY clientes_update_roles ON public.clientes
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
  );

-- DELETE físico bloqueado (sem policy → deny). Soft delete = UPDATE de deleted_at.

-- Contatos
CREATE TABLE public.cliente_contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cargo text,
  email text,
  telefone_ddi text,
  telefone_numero text,
  principal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX cliente_contatos_cliente_idx ON public.cliente_contatos (cliente_id) WHERE deleted_at IS NULL;

CREATE TRIGGER cliente_contatos_set_updated_at
  BEFORE UPDATE ON public.cliente_contatos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.cliente_contatos TO authenticated;
GRANT ALL ON public.cliente_contatos TO service_role;

ALTER TABLE public.cliente_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY cliente_contatos_select_auth ON public.cliente_contatos
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY cliente_contatos_insert_roles ON public.cliente_contatos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
  );

CREATE POLICY cliente_contatos_update_roles ON public.cliente_contatos
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
  );
