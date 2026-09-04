---
title: Executar FAT
description: Como rodar o FAT com cliente: percorrer o checklist, anexar evidência, aprovar/reprovar itens.
category: qualidade
slug: executar-fat
tipo: guia
nivel: intermediario
tags: [fat, execucao, checklist, evidencia]
papeis: [admin, manager, quality]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Abra o FAT no dia; status muda para **Em execução**.
- Percorra o checklist item por item, com **evidência anexa** obrigatória em itens críticos.
- Cada item = **Aprovado / Reprovado / N.A.** (justificado).
- Item reprovado abre **RNC** e trava o encerramento.
:::

## Passo a passo

:::step{n="1" title="Iniciar o FAT no dia" img="01-fat-lista.png" alt="Lista de FATs com FAT em status Agendado sendo iniciado"}
Na hora combinada, abra o FAT (aba **QUALIDADE → FAT**, filtro **Agendado**). Botão **Iniciar FAT** muda status para **Em execução** e trava a agenda dos participantes.
:::

:::step{n="2" title="Percorrer o checklist" img="05-fat-detalhe.png" alt="Detalhe do FAT em execução com seções expansíveis e itens marcados como Aprovado ou Reprovado"}
O checklist já vem estruturado pelo template. Trabalhe seção a seção:

- **Estrutural** → **Elétrica** → **Hidráulica** → **Segurança** → **Funcional**.
- Cada item pede: descrição, tipo (visual/medição/ensaio), critério, resultado.
:::

:::step{n="3" title="Marcar resultado por item"}
Três opções:

- **Aprovado** — em conformidade; anexe evidência se o item exige.
- **Reprovado** — abre imediatamente uma [RNC](/ajuda/documentacao/qualidade/rnc-e-reprovacao) vinculada ao item.
- **N.A.** — não aplicável; exige justificativa curta.
:::

:::step{n="4" title="Anexar evidência"}
Foto, medição, print de teste, laudo. Nome do arquivo padronizado (`fat-<num>-item-<id>-<descricao>.jpg`). Sem evidência, o item fica pendente e trava encerramento.
:::

:::step{n="5" title="Comentários e observações"}
Cada item aceita comentário livre — bom para registrar variações (temperatura ambiente, tensão de rede, lote de matéria-prima) que podem impactar o resultado.
:::

:::step{n="6" title="Pausar / retomar"}
Se o FAT precisar pausar (almoço, dia seguinte), botão **Pausar**. Ao retomar, o cronômetro produtivo reinicia e o histórico registra o intervalo.
:::

:::dica
Rode itens de segurança primeiro. Se falha grave for detectada cedo, você poupa horas de FAT em coisas que não vão passar.
:::

:::atencao
Não "sinalize N.A." para pular item difícil. Auditoria detecta padrão e a Qualidade perde credibilidade com o cliente.
:::

:::erro
**"Cliente não conseguiu entrar no link"** → confirme e-mail cadastrado; reenvie convite pelo painel do FAT. Link é individual e expira 24h após o evento.
:::

## Ver também

- [Encerrar FAT](/ajuda/documentacao/qualidade/encerrar-fat)
- [RNC e reprovação](/ajuda/documentacao/qualidade/rnc-e-reprovacao)
