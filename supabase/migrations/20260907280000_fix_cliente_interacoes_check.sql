-- cliente_interacoes.tipo so aceitava 'nota','email','ligacao','reuniao',
-- 'tarefa','evento_sistema' desde a criacao. Mas addClienteInteracao aceita
-- e a UI oferece 'visita' como tipo real -- toda tentativa de registrar uma
-- visita falha com erro de banco. recordClienteEvent (upload/remocao de
-- documento, socio adicionado/removido, geocodificacao) grava com tipo =
-- 'documento_anexado'/'socio_adicionado'/etc -- nenhum desses valores
-- estava no CHECK, e a funcao nao verifica o erro do insert: a acao
-- principal sempre funciona, mas o evento na timeline falha e desaparece
-- em silencio.

ALTER TABLE public.cliente_interacoes DROP CONSTRAINT IF EXISTS cliente_interacoes_tipo_check;
ALTER TABLE public.cliente_interacoes ADD CONSTRAINT cliente_interacoes_tipo_check
  CHECK (tipo IN (
    'nota','email','ligacao','reuniao','tarefa','evento_sistema',
    'visita','documento_anexado','documento_removido',
    'socio_adicionado','socio_removido','geocoded'
  ));
