-- FAT reprovado ficava travado pra sempre -- nao havia como reabrir nem
-- religar a uma nova tentativa, apesar do e-mail de reprovacao instruir
-- "reagendar novo FAT". A unica saida era criar um FAT novo do zero pela
-- tela ja existente, sem nenhum vinculo de rastreabilidade com o reprovado.

ALTER TABLE public.fat_relatorios
  ADD COLUMN IF NOT EXISTS fat_origem_id uuid REFERENCES public.fat_relatorios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS fat_relatorios_origem_idx ON public.fat_relatorios(fat_origem_id);
