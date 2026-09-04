-- Data API GRANTs faltando em equipamento_pagina / equipamento_pagina_bloco
-- (RLS já configurada; PostgREST exige GRANT explícito para authenticated/anon/service_role)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_pagina TO authenticated;
GRANT ALL ON public.equipamento_pagina TO service_role;
GRANT SELECT ON public.equipamento_pagina TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_pagina_bloco TO authenticated;
GRANT ALL ON public.equipamento_pagina_bloco TO service_role;
GRANT SELECT ON public.equipamento_pagina_bloco TO anon;
