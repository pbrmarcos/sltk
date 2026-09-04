# Rotina comercial dentro do card da oportunidade

Objetivo: o time comercial abre o card e resolve tudo ali — criar oportunidade, gerar orçamento e converter em cliente — sem precisar procurar telas.

## 1. Barra "Próximo passo" no topo do card

Uma faixa fixa logo abaixo do título, com o passo atual destacado e um único botão primário (o que deve ser feito agora). Sequência:

```text
Dados  →  Entrevista  →  Checklist  →  Orçamento  →  Ganho  →  Cliente ativo
```

Regra do botão primário conforme o estágio:
- Novo / Qualificado: "Agendar entrevista" (abre a aba Agenda já existente).
- Proposta / Negociação: "Gerar orçamento" (novo fluxo abaixo).
- Ganho sem cliente: "Converter em cliente ativo" (assistente existente).
- Cliente ativo: "Ficha do cliente".

Ao lado, um resumo de pendências em texto curto ("falta CNPJ", "sem orçamento", "sem entrevista"), para o vendedor saber por que o passo está bloqueado.

## 2. Gerar orçamento a partir da oportunidade

- Botão "Gerar orçamento" no card (não só nos cards de Ganho do kanban).
- Abre `/comercial/orcamento/novo` já com a oportunidade: cliente pré-selecionado (quando existe cliente vinculado), título herdado do título da oportunidade, moeda padrão e o vínculo `oportunidade_id`/`oportunidade_codigo` gravado no orçamento.
- Se a oportunidade ainda não tem cliente cadastrado, o card avisa e oferece "Converter em cliente ativo" antes, mantendo a rotina em ordem.
- Nova aba "Orçamentos" no card, listando os orçamentos já gerados para aquela oportunidade com código, versão, valor e link para abrir/baixar o PDF. Quando existe orçamento, o valor da oportunidade pode ser atualizado com um clique ("usar valor do orçamento").

## 3. Criar oportunidade sem sair do contexto

- No card, ação "Nova oportunidade para esta empresa" — abre o diálogo de nova oportunidade com empresa, contato, e-mail, telefone e cliente já preenchidos a partir da oportunidade atual. Útil para segunda máquina/segundo projeto do mesmo cliente.
- No assistente de conversão, o estado vazio "Nenhuma oportunidade encontrada" ganha o mesmo botão, criando a oportunidade já vinculada ao cliente e voltando para o passo 2.

## 4. Fechamento até cliente

- "Marcar ganho" dentro do card (hoje só existe no kanban), com aviso quando faltar orçamento gerado.
- Após ganho, a barra passa automaticamente para "Converter em cliente ativo" e, concluído, para "Ficha do cliente" — deixando visível que a rotina terminou.

## Detalhes técnicos

- `EditOportunidadeDialog.tsx`: nova barra de passos (componente `ProximoPassoBar` em `src/components/comercial/pipeline/`), aba "Orçamentos", ações de ganho/nova oportunidade.
- Prefill do wizard: aceitar `search params` (`oportunidade`, `cliente`, `titulo`) em `comercial.orcamento.novo.tsx` e repassar como `initialPayload`/`initialTitulo` ao `OrcamentoWizard`, preenchendo `oportunidade_id`/`oportunidade_codigo` no payload gerado.
- Listagem de orçamentos por oportunidade: consulta em `documentos` filtrando `tipo = orcamento` e `payload->>oportunidade_id`, exposta por server function nova em `src/lib/orcamento.functions.ts` (ou arquivo equivalente já existente).
- `NewOportunidadeDialog.tsx`: aceitar props de pré-preenchimento (empresa, contato, cliente_id).
- Regras de pré-requisito reaproveitam `src/lib/comercial/guia.ts`, sem duplicar textos.
- Sem mudança de schema; apenas leitura/escrita nas tabelas já existentes.
