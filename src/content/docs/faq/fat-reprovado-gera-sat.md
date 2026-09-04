---
question: FAT reprovado gera SAT automaticamente?
category: qualidade
tags: [fat, sat, reprovacao, pos-vendas]
---

Depende do desfecho: **Reprovado** trava expedição e não gera SAT — um novo FAT é necessário. Já **Aprovado com ressalvas** libera a expedição e cria automaticamente uma SAT no Pós-vendas com as RNCs residuais herdadas como plano da primeira visita. **Aprovado** limpo não gera SAT — ela nasce depois, sob demanda, em `/pos-vendas/sat`.
