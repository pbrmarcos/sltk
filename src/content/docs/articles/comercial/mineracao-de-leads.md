---
title: Mineração de leads (comércio exterior)
description: Como consultar transações de importação e exportação por NCM, empresa ou rota comercial, entender os limites do contrato e transformar os resultados em suspects do pipeline.
category: comercial
slug: mineracao-de-leads
tipo: guia
nivel: intermediario
tags: [mineracao, leads, penta, ncm, comercio-exterior, suspect, prospeccao]
papeis: [admin, manager, sales]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- A tela fica em `/comercial/mineracao` e consulta dados reais de importação/exportação do provedor de comércio exterior.
- Antes de buscar, a **base de dados** (país + importação/exportação) precisa estar sincronizada — a lista fica salva no sistema, agrupada por **continente › país**.
- Três tipos de consulta: **Empresas**, **Empresa ↔ contraparte** e **Rota comercial**.
- O consumo do contrato (bases, NCMs, empresas) só é atualizado quando você clica em **Atualizar**.
- Toda busca fica salva em **Histórico de buscas** — repetir os mesmos filtros mostra aviso e permite reabrir o resultado sem gastar cota.
:::

## Pré-requisitos

- Papel `sales`, `manager` ou `admin`.
- Bases sincronizadas ao menos uma vez (feito por `admin`/`manager`).
- Saber o **NCM** (rubro) do produto que você quer rastrear — é o filtro que mais pesa no resultado.

## Como a tela está organizada

| Bloco | Para que serve |
|---|---|
| **Consumo do contrato** | Medidores de Bases (países), Rubros (NCM) e Empresas já usados × limite real do contrato |
| **Ver o que já foi consultado** | Listas pesquisáveis de bases, NCMs e empresas que já entraram na cota |
| **Tipo de consulta** | Empresas · Empresa ↔ contraparte · Rota comercial |
| **Filtros** | Base, período, NCMs e (opcional) filtros de empresa/contraparte |
| **Histórico de buscas** | Toda consulta salva, com período, totais e data |
| **Resultados** | Tabela com empresa, contraparte, NCMs, operações, valor, ticket médio e ação **Enviar como suspect** |

## Passo a passo — primeira consulta

:::step{n="1" title="Sincronizar as bases (uma vez)" img="mineracao-de-leads-1.png" alt="Barra de sincronização das bases mostrando total de bases e data da última sincronização, com o botão Sincronizar bases à direita"}
Se o seletor **Base de dados** aparecer vazio, as bases ainda não foram carregadas. `admin` e `manager` veem o botão **Sincronizar bases**; os demais papéis veem **Solicitar sincronização**, que notifica a administração. A sincronização roda em lotes de países e mostra o progresso na própria barra.
:::

:::step{n="2" title="Escolher o tipo de consulta" img="mineracao-de-leads-1.png" alt="Seletor de tipo de consulta com as opções Empresas, Empresa e contraparte e Rota comercial"}
- **Empresas** — agrupa por empresa local e mostra seus principais parceiros no exterior.
- **Empresa ↔ contraparte** — agrupa cada relação comercial (quem compra de quem).
- **Rota comercial** — você escolhe **país de destino** (quem comprou) e **país de origem** (quem vendeu); as duas pontas viram lead.
:::

:::step{n="3" title="Selecionar a base de dados" img="mineracao-de-leads-1.png" alt="Seletor Base de dados agrupado por continente e país, com campo de filtro acima e contador de bases"}
O seletor é agrupado por **continente › país** (ex.: "América do Sul › Argentina"). Use o campo de filtro para buscar por país, sigla, nome da base ou tipo (importação/exportação) — sem precisar de acento. A base escolhida fica fixada em um chip com país, título e limite de operações.
:::

:::step{n="4" title="Definir o período" img="mineracao-de-leads-1.png" alt="Campos de data inicial e final com atalhos Últimos 3, 6 e 12 meses"}
Use os atalhos **Últimos 3 / 6 / 12 meses** ou informe as datas. O período não pode passar de 12 meses e precisa cair dentro da vigência da base — se ficar parcialmente fora, o sistema ajusta automaticamente para o intervalo disponível e avisa.
:::

:::step{n="5" title="Informar os NCMs" img="mineracao-de-leads-1.png" alt="Campo de NCM com os códigos adicionados em chips e botão de remover em cada um"}
Digite o código e pressione Enter para adicionar. Cada NCM novo consome cota de **Rubros** do contrato — comece pelos códigos mais representativos do equipamento.
:::

:::step{n="6" title="Filtros de empresa e contraparte (opcional)" img="mineracao-de-leads-1.png" alt="Painel expandido com os campos Empresa local contém, Contraparte no exterior contém, Mínimo de operações e Valor mínimo em dólares"}
Abra **Filtros de empresa e contraparte** para restringir por nome (**Empresa local contém**, **Contraparte no exterior contém**), **Mín. de operações** e **Valor mínimo (USD)**. Preencher os dois campos de nome isola as transações entre duas empresas específicas.
:::

:::step{n="7" title="Buscar e enviar para o pipeline" img="mineracao-de-leads-1.png" alt="Tabela de resultados com colunas Empresa, Contraparte, NCMs, Operações, Valor e Ticket médio e o botão Enviar como suspect"}
Clique **Buscar transações**. Na tabela, selecione as linhas relevantes, escolha em **Abordar** quem vira lead (Importador, Fornecedor ou As duas pontas) e clique **Enviar como suspect** — os registros entram no pipeline comercial. O campo **Anotação** guarda o contexto da abordagem.
:::

## Limites do contrato

O bloco **Consumo do contrato** lê os valores reais do provedor: bases (países) permitidas, rubros (NCM) e empresas indexadas, além do **estado do contrato** e da **vigência**. Os números só mudam quando você clica em **Atualizar** — o resultado fica salvo no sistema para não gastar chamadas à toa.

:::dica
Antes de abrir um NCM ou um país novo, use **Ver o que já foi consultado**: bases, NCMs e empresas que já estão na lista não consomem cota de novo.
:::

## Buscas repetidas

Se os mesmos filtros já tiverem sido usados, aparece um aviso com a data da busca anterior e duas opções:

- **Ver resultado salvo** — reabre o resultado gravado, sem consumir cota.
- **Buscar de novo na API** — refaz a consulta no provedor.

O **Histórico de buscas** lista as consultas salvas com período, total de empresas/relações e operações. Clicar em uma linha recarrega aquele resultado.

## Quando a busca dá erro

| Mensagem | O que fazer |
|---|---|
| "Nenhuma base encontrada para esse filtro" | Limpe o filtro; se a lista continuar vazia, sincronize as bases (ou solicite à administração). |
| Período fora do intervalo da base | Ajuste as datas para dentro da vigência informada no chip da base. |
| Consulta grande demais | Reduza o período ou a quantidade de NCMs e busque de novo. |
| Limite do contrato atingido | O medidor fica em vermelho — fale com a administração antes de abrir novas bases/NCMs. |
| Base em manutenção / instabilidade do provedor | Tente de novo mais tarde; a mensagem original do provedor aparece entre parênteses para o suporte. |

:::atencao
Cada país + operação (importação ou exportação) é uma **base** distinta e consome uma posição da cota. Planeje quais mercados abrir antes de sair sincronizando e consultando.
:::

## Ver também

- [Pipeline de oportunidades](/ajuda/documentacao/comercial/pipeline-de-oportunidades)
- [Visão geral do Comercial](/ajuda/documentacao/comercial/visao-geral)
- [Cadastrar cliente](/ajuda/documentacao/clientes-fornecedores/cadastrar-cliente)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Mineração de leads" img="mineracao-de-leads-1.png" alt="Mineração de leads"}
Mineração de leads
:::

<!-- /SHOTS:AUTO -->
