# Orçamento a partir da oportunidade: usar a qualificação do card

## Problema

Ao clicar em "Gerar orçamento" numa oportunidade, a tela de novo orçamento abre com um campo vazio "Buscar cliente / + Novo cliente", como se nada tivesse sido preenchido. Toda a qualificação já feita no card do pipeline (empresa, contato, e-mail, telefone, país, documento, valor, moeda, título) é ignorada. Quando a oportunidade é um lead sem cliente, o usuário fica travado: precisa cadastrar o cliente do zero, redigitando o que já existe.

## O que muda

1. **Passo 1 do orçamento vira "Cliente da oportunidade"**, não uma busca em branco.
   - Oportunidade **com cliente vinculado**: o cliente aparece já selecionado num cartão de resumo (razão social, documento, país, moeda), com link "Trocar cliente" que só então revela a busca.
   - Oportunidade **lead (sem cliente)**: aparece um cartão com os dados qualificados do card (empresa, contato, e-mail, telefone, país, documento) e dois caminhos claros:
     - **"Criar cliente com estes dados"** — abre o modal de novo cliente já preenchido com tudo que veio da oportunidade; ao salvar, o cliente é selecionado, vinculado à oportunidade e o wizard continua sem perder nada.
     - **"Vincular a um cliente existente"** — abre a busca atual, para o caso de a empresa já estar cadastrada.
   - Nada é apagado ao voltar/alternar aba: o rascunho local do wizard já existente passa a guardar também o contexto da oportunidade.

2. **Herança de dados da oportunidade** no orçamento: título, moeda (se a oportunidade tiver moeda/valor em US$ ou R$) e a vinculação `oportunidade_id` continuam automáticas, com o cabeçalho mostrando "Orçamento de OPP-XXXX — Empresa".

3. **Aviso de duplicidade suave**: antes de criar cliente a partir do lead, busca por documento e por razão social semelhante; se achar, sugere vincular ao existente em vez de duplicar.

4. **Vínculo de volta**: criar o cliente pelo wizard grava `cliente_id` na oportunidade (mesma ação de "Promover a cliente"), então o card do pipeline deixa de mostrar "Lead (sem cliente)".

## Detalhes técnicos

- Nova server function `getOportunidade` em `src/lib/oportunidades.functions.ts` (por `id`, com RLS do usuário), retornando `cliente_id`, `empresa_lead`, `nome_lead`, e-mail, telefone, país, documento, título, valor e moeda. Hoje só existe `listPipeline`, por isso o wizard não tem como ler o contexto.
- `src/routes/_authenticated/comercial.orcamento.novo.tsx`: mantém os search params atuais e repassa a oportunidade ao wizard; o wizard carrega o restante via `useQuery` (sem loader, para não quebrar prerender).
- `src/components/orcamento/OrcamentoWizard.tsx`: novo bloco `ClienteDaOportunidade` no passo 0, estado `trocandoCliente` para revelar a busca, `initialValues` do `NovoClienteDialog` alimentados pela oportunidade, e inclusão do contexto no `useFormDraft`.
- Reuso de `NovoClienteDialog` + `ClienteForm variant="modal"` (já existentes) e da rotina de promoção a cliente já usada em `EditOportunidadeDialog`.
- `EditOportunidadeDialog` e `PipelineBoard` continuam enviando os mesmos parâmetros — nenhuma mudança de rota necessária.

## Fora de escopo

Alterações no cálculo de itens, PDF e versionamento do orçamento.
