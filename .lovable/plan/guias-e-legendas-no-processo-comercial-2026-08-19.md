# Guias e legendas no processo comercial

Objetivo: em cada etapa do funil (suspect → oportunidade → cliente), o usuário vê de forma clara o que precisa estar pronto **antes** de avançar — e como criar uma oportunidade quando não existe nenhuma.

## 1. Faixa "Como funciona o processo comercial"

No topo do Pipeline (`/comercial/pipeline`), uma faixa compacta e recolhível mostrando a trilha completa:

```text
Suspect (lead/mineração) → Oportunidade → Entrevista → Checklist → Proposta → Negociação → Ganho → Cliente ativo + Processo
```

- Cada etapa é clicável e abre um popover curto: o que é, o que fazer, e o link para o artigo da documentação existente.
- Estado recolhido guardado no navegador (o usuário não precisa fechar toda vez).

## 2. Legenda por coluna do Kanban

No cabeçalho de cada coluna, um ícone de ajuda com dica objetiva "para sair desta coluna, garanta que...":

| Coluna | Pré-requisito exibido |
|---|---|
| Novo | Empresa e contato preenchidos; origem do lead identificada |
| Qualificado | Entrevista realizada/agendada e necessidade confirmada |
| Proposta | Checklist técnico respondido e valor estimado preenchido |
| Negociação | Proposta enviada, prazo e condições registrados |
| Ganho | Cliente vinculado (não só lead) para permitir a conversão |

O mesmo texto aparece como aviso suave (não bloqueante) quando o card é arrastado sem o dado esperado — por exemplo, mover para Ganho sem cliente vinculado.

## 3. Como criar oportunidade a partir de um suspect

Três caminhos, todos com legenda visível:

- **Coluna Novo vazia**: estado vazio explicando "Oportunidades nascem de um suspect: crie manualmente, converta um lead da Mineração ou receba do formulário público" + botão **Nova oportunidade**.
- **Botão Nova oportunidade**: o diálogo ganha um texto de apoio no topo e microtextos por campo (título = escopo curto; valor/probabilidade alimentam o valor ponderado).
- **Ficha do cliente/lead**: botão "Criar oportunidade" já pré-vinculando a empresa, para não gerar lead duplicado.

## 4. Assistente Converter em Cliente Ativo

Quando o passo "Oportunidades" não encontra nenhuma (situação da tela enviada), em vez de apenas "Nenhuma oportunidade encontrada":

- Explicar o motivo provável (as oportunidades da empresa estão vinculadas ao lead e não ao cliente selecionado, ou já foram convertidas).
- Oferecer ação direta: **Criar oportunidade para este cliente** e **Vincular oportunidade existente**.
- Impedir avançar com contadores inconsistentes (hoje mostra "Ganhar: 1" com lista vazia).

## 5. Consistência nas demais telas comerciais

Mesmo padrão de legenda (componente único) em: Mineração, Clientes, Entrevistas e Checklists — sempre respondendo "o que fazer antes" e "qual o próximo passo", com link para a documentação correspondente.

## Detalhes técnicos

- Novo componente `src/components/comercial/ProcessoComercialGuia.tsx` (faixa + popovers) e `StageHintButton` reutilizável, alimentados por um único mapa `src/lib/comercial/guia.ts` (etapa → título, pré-requisitos, rota do artigo).
- Ajustes em `PipelineBoard.tsx` (cabeçalhos de coluna, estado vazio, aviso ao arrastar), `NewOportunidadeDialog.tsx` (textos de apoio) e `ConvertWizardDialog.tsx` (estado vazio acionável + correção dos contadores).
- Links de documentação usam o `route-map` já existente; nenhuma mudança de schema ou regra de negócio no backend.
