-- Adiciona novos módulos ao enum app_module.
-- ALTER TYPE ADD VALUE precisa ser feito em transação separada do uso do valor,
-- por isso esta migration roda antes da que cria as policies/seeds que referenciam o valor.

ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'fornecedores';
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'compras';
