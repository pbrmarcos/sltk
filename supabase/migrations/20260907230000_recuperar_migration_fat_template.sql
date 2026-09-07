-- fat_template / fat_template_secao / fat_template_item existem no banco
-- real (e em src/integrations/supabase/types.ts) mas nunca tiveram uma
-- migration -- foram criadas fora do fluxo versionado (provavelmente
-- direto no Studio, espelhando sat_template/_secao/_item, seu par já
-- migrado em 20260620232222_a1837339-bb04-4f64-9085-1588c7b8c769.sql).
-- Um ambiente novo provisionado só a partir de supabase/migrations (CI,
-- staging limpo, disaster recovery) não teria essas 3 tabelas, quebrando
-- a tela de Templates de FAT.
--
-- Esta migration só recupera o registro perdido: todo o bloco só executa
-- se a tabela ainda não existir, então no banco real (onde ela já existe)
-- isso é um no-op completo -- não altera nenhum comportamento em runtime,
-- só evita o drift de schema num ambiente novo.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fat_template'
  ) THEN
    CREATE TYPE public.fat_item_tipo AS ENUM (
      'ok_nok_na',
      'sim_nao_comentario',
      'texto',
      'numero',
      'data',
      'checkbox_multi',
      'parametro_operacional',
      'cabecalho'
    );

    CREATE TABLE public.fat_template (
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

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.fat_template TO authenticated;
    GRANT ALL ON public.fat_template TO service_role;
    ALTER TABLE public.fat_template ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "fat_template_select_auth" ON public.fat_template
      FOR SELECT TO authenticated USING (true);
    CREATE POLICY "fat_template_insert_admin" ON public.fat_template
      FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
    CREATE POLICY "fat_template_update_admin" ON public.fat_template
      FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
    CREATE POLICY "fat_template_delete_admin" ON public.fat_template
      FOR DELETE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role));

    CREATE OR REPLACE FUNCTION public.tg_fat_template_set_ativo()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SET search_path = public
    AS $fn$
    BEGIN
      IF NEW.ativo IS TRUE THEN
        UPDATE public.fat_template
           SET ativo = false, updated_at = now()
         WHERE id <> NEW.id AND ativo = true;
      END IF;
      NEW.updated_at := now();
      RETURN NEW;
    END $fn$;

    CREATE TRIGGER fat_template_before_iu
      BEFORE INSERT OR UPDATE ON public.fat_template
      FOR EACH ROW EXECUTE FUNCTION public.tg_fat_template_set_ativo();

    CREATE TABLE public.fat_template_secao (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      template_id UUID NOT NULL REFERENCES public.fat_template(id) ON DELETE CASCADE,
      ordem INTEGER NOT NULL DEFAULT 0,
      titulo TEXT NOT NULL,
      descricao TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.fat_template_secao TO authenticated;
    GRANT ALL ON public.fat_template_secao TO service_role;
    ALTER TABLE public.fat_template_secao ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "fat_template_secao_select_auth" ON public.fat_template_secao
      FOR SELECT TO authenticated USING (true);
    CREATE POLICY "fat_template_secao_write_admin" ON public.fat_template_secao
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

    CREATE INDEX fat_template_secao_template_idx ON public.fat_template_secao(template_id, ordem);

    CREATE TABLE public.fat_template_item (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      secao_id UUID NOT NULL REFERENCES public.fat_template_secao(id) ON DELETE CASCADE,
      ordem INTEGER NOT NULL DEFAULT 0,
      label TEXT NOT NULL,
      tipo public.fat_item_tipo NOT NULL DEFAULT 'ok_nok_na',
      obrigatorio BOOLEAN NOT NULL DEFAULT false,
      permite_anexo BOOLEAN NOT NULL DEFAULT true,
      permite_comentario BOOLEAN NOT NULL DEFAULT true,
      requer_foto_nok BOOLEAN NOT NULL DEFAULT false,
      ajuda TEXT,
      opcoes JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.fat_template_item TO authenticated;
    GRANT ALL ON public.fat_template_item TO service_role;
    ALTER TABLE public.fat_template_item ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "fat_template_item_select_auth" ON public.fat_template_item
      FOR SELECT TO authenticated USING (true);
    CREATE POLICY "fat_template_item_write_admin" ON public.fat_template_item
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

    CREATE INDEX fat_template_item_secao_idx ON public.fat_template_item(secao_id, ordem);
  END IF;
END $$;
