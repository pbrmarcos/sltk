
ALTER TYPE public.equipamento_status ADD VALUE IF NOT EXISTS 'planejamento' BEFORE 'operacional';
ALTER TYPE public.equipamento_status ADD VALUE IF NOT EXISTS 'em_fabricacao' BEFORE 'operacional';
ALTER TYPE public.equipamento_status ADD VALUE IF NOT EXISTS 'em_qualidade' BEFORE 'operacional';
ALTER TYPE public.equipamento_status ADD VALUE IF NOT EXISTS 'pronto_entrega' BEFORE 'operacional';
ALTER TYPE public.equipamento_status ADD VALUE IF NOT EXISTS 'em_transporte' BEFORE 'operacional';
ALTER TYPE public.equipamento_status ADD VALUE IF NOT EXISTS 'em_instalacao' BEFORE 'operacional';
