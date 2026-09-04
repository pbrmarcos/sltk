
CREATE TABLE public.paises_config (
  codigo char(2) PRIMARY KEY,
  nome text NOT NULL,
  documento_nome text NOT NULL,
  documento_regex text NOT NULL,
  documento_mascara text NOT NULL,
  moeda_padrao char(3) NOT NULL,
  idioma_padrao text NOT NULL,
  usa_cep_lookup boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.paises_config TO authenticated;
GRANT ALL ON public.paises_config TO service_role;

ALTER TABLE public.paises_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY paises_config_select_auth ON public.paises_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY paises_config_insert_admin ON public.paises_config
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY paises_config_update_admin ON public.paises_config
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY paises_config_delete_admin ON public.paises_config
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER paises_config_set_updated_at
  BEFORE UPDATE ON public.paises_config
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.paises_config
  (codigo, nome, documento_nome, documento_regex, documento_mascara, moeda_padrao, idioma_padrao, usa_cep_lookup)
VALUES
  ('BR','Brasil','CNPJ','^[A-Z0-9]{12}[0-9]{2}$','XX.XXX.XXX/XXXX-XX','BRL','pt',true),
  ('AR','Argentina','CUIT','^[0-9]{11}$','XX-XXXXXXXX-X','ARS','es',false),
  ('CL','Chile','RUT','^[0-9]{7,8}[0-9K]$','XX.XXX.XXX-X','CLP','es',false),
  ('PE','Peru','RUC','^(10|15|17|20)[0-9]{9}$','XXXXXXXXXXX','PEN','es',false),
  ('UY','Uruguai','RUT','^[0-9]{12}$','XXXXXXXXXXXX','UYU','es',false),
  ('PY','Paraguai','RUC','^[0-9]{6,9}$','XXXXXXXX-X','PYG','es',false),
  ('CO','Colômbia','NIT','^[0-9]{9,10}$','XXX.XXX.XXX-X','COP','es',false),
  ('EC','Equador','RUC','^[0-9]{10}001$','XXXXXXXXXXXXX','USD','es',false),
  ('BO','Bolívia','NIT','^[0-9]{7,12}$','XXXXXXXXXX','BOB','es',false),
  ('PA','Panamá','RUC','^[0-9A-Z\-]{5,20}$','livre','USD','es',false),
  ('CR','Costa Rica','Cédula Jurídica','^[0-9]{10}$','X-XXX-XXXXXX','CRC','es',false),
  ('VE','Venezuela','RIF','^[JGVEP][0-9]{9}$','L-XXXXXXXX-X','VES','es',false),
  ('SV','El Salvador','NIT','^[0-9]{14}$','XXXX-XXXXXX-XXX-X','USD','es',false),
  ('NI','Nicarágua','RUC','^[A-Z0-9]{14}$','XXXXXXXXXXXXXX','NIO','es',false),
  ('HN','Honduras','RTN','^[0-9]{14}$','XXXXXXXXXXXXXX','HNL','es',false),
  ('GT','Guatemala','NIT','^[0-9]{6,8}[0-9K]$','XXXXXXX-X','GTQ','es',false),
  ('MX','México','RFC','^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$','AAA-XXXXXX-AAA','MXN','es',false);
