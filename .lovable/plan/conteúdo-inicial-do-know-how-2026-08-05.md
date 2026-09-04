# Conteúdo inicial do Know-how

Hoje o módulo Know-how está com as 7 coleções criadas (Montagem, Elétrica, Comissionamento, FAT/SAT, Comercial, Compras, Segurança) e **nenhum item cadastrado** — a tela abre vazia. O objetivo é entregar uma biblioteca inicial real e útil, escrita a partir dos fluxos que já existem no sistema.

## O que será criado

14 itens publicados, distribuídos pelas coleções, misturando artigos (explicam o porquê) e checklists (usados em campo):

**Montagem**
- Checklist de liberação de conjunto mecânico (pré-montagem, torque, alinhamento, folgas)
- Boas práticas de montagem em inox sanitário (acabamento, soldas, evitar contaminação)

**Elétrica**
- Checklist de energização segura de painel (isolação, aterramento, sequência de fases, LOTO)
- Padrão de identificação de cabos e bornes usado nos projetos Solutek

**Comissionamento**
- Roteiro de partida assistida de linha (etapas, responsáveis, registros)
- Ajuste fino de sensores e set-points: erros mais comuns

**FAT / SAT**
- Checklist de FAT na fábrica (o que testar antes do embarque)
- Como conduzir o SAT no cliente e registrar pendências sem travar a entrega

**Comercial**
- Como preparar uma entrevista técnica de segmento (o que perguntar e por quê)
- Do levantamento à proposta: informações mínimas para orçar sem retrabalho

**Compras**
- Checklist de abertura de RFQ (escopo, BOM, prazo, critérios de comparação)
- Como avaliar cotações além do preço (prazo, procedência, condições)

**Segurança**
- Checklist de segurança para trabalho em campo no cliente
- Bloqueio e etiquetagem (LOTO): quando aplicar e como registrar

Cada item terá: título, resumo de uma linha, corpo estruturado em passos/verificações, tags e papéis-alvo (ex.: montador, eletricista, engenharia, comercial, compras) para aparecer para as pessoas certas.

## Detalhes técnicos

- Conteúdo inserido por migração SQL em `kh_itens`, com `status = 'publicado'`, `versao = 1`, `colecao_id` resolvido pelo `slug` da coleção e `slug` do item único.
- O corpo hoje é renderizado como texto puro (`whitespace-pre-wrap`) em `know-how.$slug.tsx`, então o texto será escrito já formatado com marcadores simples e seções em caixa alta/numeradas — sem depender de markdown.
- Sem alteração de schema, RLS ou permissões: só dados.

## Fora do escopo

Vídeos e PDFs (precisam de arquivos reais no bucket) e quizzes/certificações não entram nesta primeira carga.
