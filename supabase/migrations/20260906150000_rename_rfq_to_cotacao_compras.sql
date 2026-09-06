-- Rename completo do conceito "RFQ" (pedido de cotação a fornecedor, dentro
-- de Compras) para "Cotação" no banco. É um conceito totalmente diferente do
-- checklist técnico comercial (já renomeado na migration
-- 20260906140000_rename_rfq_to_checklist.sql) — a UI de Compras já mostra
-- "Cotação" há um tempo; esta migration alinha os nomes reais de
-- tabela/enum/evento por baixo.
--
-- Índices e políticas de RLS mantêm o nome antigo (Postgres não exige
-- renomear para continuar funcionando — são referenciados por OID, não por
-- nome) — puramente cosmético, fora de escopo desta migration.

-- 1) Enums
ALTER TYPE public.insumo_rfq_canal RENAME TO insumo_cotacao_canal;
ALTER TYPE public.insumo_rfq_status RENAME TO insumo_cotacao_status;

-- 2) Tabela
ALTER TABLE public.insumo_rfq_envios RENAME TO insumo_cotacao_envios;

-- 3) Renomear os event_key de e-mail (são a PK de email_event_config, com FK
-- ON DELETE CASCADE em email_event_recipients — sem ON UPDATE CASCADE, então
-- um UPDATE direto na PK quebraria se houver linhas filhas). Copia para a
-- chave nova preservando o conteúdo configurado, depois remove a antiga.
INSERT INTO public.email_event_config
  (event_key, module, label, description, enabled, subject_template, body_template,
   create_calendar_event, calendar_duration_min, required_vars)
SELECT
  'cotacao.enviada_fornecedor', module, label, description, enabled, subject_template,
  body_template, create_calendar_event, calendar_duration_min, required_vars
FROM public.email_event_config
WHERE event_key = 'rfq.enviada_fornecedor'
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_event_recipients (event_key, role, mode)
SELECT 'cotacao.enviada_fornecedor', role, mode
FROM public.email_event_recipients
WHERE event_key = 'rfq.enviada_fornecedor'
ON CONFLICT DO NOTHING;

DELETE FROM public.email_event_config WHERE event_key = 'rfq.enviada_fornecedor';
-- email_event_recipients das linhas antigas já caem junto (ON DELETE CASCADE).

INSERT INTO public.email_event_config
  (event_key, module, label, description, enabled, subject_template, body_template,
   create_calendar_event, calendar_duration_min, required_vars)
SELECT
  'cotacao.resposta_recebida', module, label, description, enabled, subject_template,
  body_template, create_calendar_event, calendar_duration_min, required_vars
FROM public.email_event_config
WHERE event_key = 'rfq.resposta_recebida'
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_event_recipients (event_key, role, mode)
SELECT 'cotacao.resposta_recebida', role, mode
FROM public.email_event_recipients
WHERE event_key = 'rfq.resposta_recebida'
ON CONFLICT DO NOTHING;

DELETE FROM public.email_event_config WHERE event_key = 'rfq.resposta_recebida';
