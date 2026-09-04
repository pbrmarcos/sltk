# Limites reais da Penta na tela de Mineração

Hoje os medidores misturam números reais da API com limites fixos gravados nas configurações (25 bases, 30 rubros) e um card "Bases premium" cujo valor não existe na resposta da Penta — daí o falso alarme de limite estourado. O contrato ("VALID até 2029-12-31") já vem da API real.

## O que muda na tela

- **Cards de consumo** passam a usar exclusivamente o `GET /restrictions`:
  - Bases: `basesQueried` (deduplicado) sobre `totalCountriesAllowed`.
  - Rubros (NCM): `tariffCodesQueried` (deduplicado) sobre `totalTariffCodesAllowed`.
  - Empresas: `companiesQueried` (deduplicado) sobre `totalCompaniesAllowed`.
- **Card "Bases premium" removido.** Não há campo correspondente na API; nada é inventado no lugar. No lugar dele entra um card informativo com **estado do contrato** (`serviceState`) e a **vigência** (`startDate` → `endDate`), todos vindos da resposta real.
- **Nova seção "Ver o que já foi consultado"** (accordion abaixo dos medidores), com três listas em abas ou blocos:
  - Países/bases já usados (`basesQueried`), com busca simples por texto.
  - NCMs já consultados (`tariffCodesQueried`).
  - Empresas já indexadas (`companiesQueried`), com nome e país.
  - Cada bloco mostra a contagem e permite copiar a lista.
- **Sem chamada automática:** ao abrir a tela, os cards são preenchidos a partir do último resultado salvo, com a etiqueta "Atualizado em <data/hora>". O `GET /restrictions` só é chamado quando o usuário clica em **Atualizar** (o botão que já existe no topo). Se nunca houve atualização, os cards aparecem vazios com o convite para clicar em Atualizar.

## Como fica por trás

- `getMineracaoStatus` deixa de chamar a Penta: lê o snapshot já gravado em `mineracao_config.restricoes_sync` e a data em `restricoes_sync_at`.
- Nova função de servidor `atualizarRestricoes` (usada pelo botão Atualizar): chama `pentaRestrictions`, deduplica as três listas, grava o snapshot normalizado em `restricoes_sync` + `restricoes_sync_at` e devolve o mesmo formato dos cards.
- O tipo `PentaRestrictions` ganha `totalCountriesAllowed` (hoje ausente) e os limites passam a vir só da API — sem `Math.min` com valores da configuração.
- Nas **Configurações › Mineração**, os campos "Bases (países)", "Bases premium", "Rubros/NCM" e "Empresas" saem do formulário (viravam fonte de números falsos). Ficam "Consultas por dia" (controle interno de cota), credenciais e intervalo. As colunas do banco permanecem, apenas deixam de ser usadas nos medidores.
- Nenhuma migração é necessária: `restricoes_sync` e `restricoes_sync_at` já existem.

## Fora do escopo

Alertas automáticos por e-mail quando o consumo se aproxima do limite.
