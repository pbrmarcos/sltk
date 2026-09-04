# Mineração de leads — contraparte, valores, histórico e exportação

## 1. Contraparte vazia e valor zerado (diagnóstico primeiro)

Hoje o resultado é montado assim: pega-se a lista `columns` da resposta do provedor, procura-se o nome da coluna (`operadorExtranjero`, `valor`, etc.) e usa-se **a posição dentro do array `columns`** para ler o valor na linha. Duas suspeitas concretas, ainda não confirmadas contra a resposta real:

- a resposta traz `positionInRow` em cada coluna — se essa posição não for igual ao índice do array, todos os campos saem trocados/vazios;
- o valor pode vir como texto formatado (`"1.234,56"`), e `Number()` nesse formato devolve `NaN`, virando `US$ 0`.

Primeiro passo da implementação: rodar uma busca real (Argentina importações, NCM conhecido) com log das colunas retornadas (`name`, `type`, `positionInRow`) e de uma linha de exemplo, para confirmar qual das duas causas é a real. Só então aplicar a correção — que em qualquer caso inclui:

- ler cada célula por `positionInRow` (com fallback para o índice do array);
- normalizar número aceitando `1.234,56`, `1,234.56`, símbolos e espaços;
- mapear contraparte pelo nome real da coluna da base, ampliando os sinônimos com o que a resposta mostrar, e guardar as colunas reais em `penta_bases.columns` (hoje esse campo grava os *parâmetros*, não as colunas de resultado);
- quando nenhuma coluna de contraparte existir na base, mostrar isso explicitamente na tela em vez de "—" silencioso.

## 2. Usuário responsável pela busca

A busca já grava `criado_por`. Falta trazer o nome/e-mail: o histórico e o cabeçalho do resultado passam a mostrar "Buscado por Fulano · 20/08 14:10", com filtro por responsável no histórico.

## 3. Histórico em aba própria

A tela ganha duas abas no topo: **Buscar transações** e **Histórico**. Cada item do histórico mostra data/hora, responsável, base (país destino/origem), NCMs, período, nº de empresas/relações e operações, com ações **Abrir resultado** e **Exportar Excel**. Campo de busca e filtro por responsável.

## 4. Exportar para Excel (.xlsx)

Botão **Exportar para Excel** na tabela de resultados e em cada item do histórico. O arquivo tem duas abas:

- **Busca** — data/hora, responsável, tipo de consulta, base/países, NCMs, período, filtros, totais;
- **Resultados** — Empresa, Contraparte, NCMs, Operações, Valor, Ticket médio, Última operação, Anotação.

## 5. Tipo de consulta mais claro

- **Rota comercial** passa a ser o modo padrão ao abrir a tela.
- Cada opção vira um cartão selecionável com descrição concreta:
  - Empresas — "Lista simples de empresas que negociaram o NCM, sem cruzar com quem comprou/vendeu."
  - Empresa → contraparte — "Mostra cada empresa e seus principais parceiros comerciais no exterior."
  - Rota comercial — "Mostra o par completo: quem vendeu de um país para quem comprou no outro — pronto para virar lead."
- Ao passar o mouse (ou tocar, no celular), aparece um mini-exemplo de linha de resultado daquele modo.

## 6. Sidebar

Remover o selo "Em construção" do item Mineração.

## Detalhes técnicos

- `src/lib/mineracao.functions.ts`: leitura de célula por `positionInRow`, parser numérico tolerante, sinônimos de coluna ampliados, `listarCampanhas` com join no `profiles` (nome/e-mail do `criado_por`), nova server fn `exportarBuscaXlsx` (ou montagem no cliente com `exceljs`, já presente no projeto) devolvendo o arquivo.
- `sincronizarBases`: gravar em `columns` as colunas reais da base (hoje grava nomes de parâmetros).
- `src/routes/_authenticated/comercial.mineracao.tsx`: `Tabs` Buscar/Histórico, cartões de modo com tooltip de exemplo, `modo` inicial `"rota"`, botão de exportação nos dois lugares, coluna/rodapé com responsável.
- `src/components/layout/AppSidebar.tsx`: remover `badge`.
- Sem migração nova prevista; se o log mostrar que precisamos persistir as colunas reais por base, isso usa a coluna `columns` que já existe.
