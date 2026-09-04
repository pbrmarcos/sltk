# Checklist de qualidade dos artigos da documentação

Todo artigo publicado em `src/content/docs/articles/**/*.md` deve passar
por este checklist antes de ser considerado "pronto". A auditoria automática
(`bun scripts/docs-audit.mjs`) cobre o que dá para verificar por script;
os itens abaixo dependem de revisão humana.

## 1. Frontmatter completo

- [ ] `title`, `description`, `category`, `slug`, `tipo`, `nivel`, `tags`,
      `papeis`, `atualizado_em` preenchidos.
- [ ] `slug` bate com o nome do arquivo (`.md`) e com a entrada em
      `src/content/docs/route-map.ts` (se aplicável).
- [ ] `atualizado_em` no formato `YYYY-MM-DD` e refletindo a última revisão real.

## 2. Estrutura mínima

- [ ] Bloco `:::tldr` no topo com 3–5 bullets acionáveis.
- [ ] Seção **Pré-requisitos** quando o fluxo depende de permissão, cadastro
      prévio ou dado externo (NF, XML, contrato).
- [ ] Passos numerados via `:::step{n="N" title="…" img="…"}` — 1 passo = 1 ação.
- [ ] Pelo menos um exemplo real (valor, código de projeto, texto de e-mail).
- [ ] Seção **Ver também** com 2+ links cruzados para artigos relacionados.

## 3. Clareza

- [ ] Cada passo começa com um verbo no imperativo ("Clique", "Selecione",
      "Anexe").
- [ ] Rótulos de UI aparecem **em negrito** exatamente como estão na tela.
- [ ] Rotas aparecem em `código` (ex.: `/logistica/embarques/novo`).
- [ ] Sem jargão técnico de banco/backend — falamos de _telas_ e _ações_,
      não de tabelas ou triggers.

## 4. Prints

- [ ] Cada passo crítico tem uma imagem em `src/assets/docs/<categoria>/…`.
- [ ] `alt` descritivo (não apenas o título do passo).
- [ ] Prints atualizados: refletem a versão atual da tela (comparar com o
      preview antes de publicar).

## 5. Links cruzados

- [ ] Link para o artigo "Visão geral" da mesma categoria.
- [ ] Link para artigos de módulos que aparecem no fluxo (ex.: um artigo de
      logística cita "Encerramento do FAT" quando o embarque só é liberado
      após FAT aprovado).
- [ ] Todas as URLs internas usam prefixo `/ajuda/documentacao/<categoria>/<slug>`
      (nunca link direto para `.md`).

## 6. Callouts com propósito

- [ ] `:::dica` — atalho, boa prática, ganho de tempo.
- [ ] `:::atencao` — pré-condição obrigatória ou risco de retrabalho.
- [ ] `:::erro` — armadilha comum + como sair dela.
- [ ] `:::nota` — informação de contexto que não é urgente.

Um artigo com 4 callouts do mesmo tipo (só `:::atencao`, por exemplo)
provavelmente está mal calibrado.

## 7. Antes de commitar

```bash
bun scripts/docs-audit.mjs           # console
bun scripts/docs-audit.mjs --write   # também salva /mnt/documents/docs-audit.md
```

Verificar:

- Nenhuma rota ativa sem doc mapeado (seção 1 do relatório).
- Nenhuma entrada órfã no mapa (seções 2 e 3).
- Nenhum artigo curto (seção 5) — se aparecer, aplicar este checklist do
  início.
- Nenhum artigo referenciando rotas legadas (seção 4).
