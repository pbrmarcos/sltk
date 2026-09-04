
ALTER TABLE public.processos ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE public.processos ALTER COLUMN stage TYPE text USING stage::text;
DROP TYPE public.processo_stage;
CREATE TYPE public.processo_stage AS ENUM (
  'Lead','ETP','Orçamento','OC','Eng. Mecânica','Eng. Elétrica','Montagem','FAT','Embarque','Pós-venda'
);
ALTER TABLE public.processos ALTER COLUMN stage TYPE public.processo_stage USING stage::public.processo_stage;
ALTER TABLE public.processos ALTER COLUMN stage SET DEFAULT 'Lead';
