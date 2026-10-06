-- Os gatilhos de auditoria de oportunidades, FAT e SAT rodavam com os
-- privilégios de quem fez a alteração. Como nenhum usuário pode gravar
-- direto em audit_log (de propósito: o log não pode ser forjado), qualquer
-- mudança de etapa/criação de oportunidade e gravações de FAT/SAT falhavam
-- com "permission denied for table audit_log" — inclusive para o admin.
-- Alinha os três com os outros 7 gatilhos de auditoria, que já são
-- SECURITY DEFINER com search_path fixo.
alter function public.tg_oportunidades_audit() security definer;
alter function public.tg_fat_audit() security definer;
alter function public.tg_sat_relatorio_audit() security definer;
