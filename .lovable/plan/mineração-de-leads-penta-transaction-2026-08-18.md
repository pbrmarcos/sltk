# Mineração de Leads (Penta-Transaction)

Novo módulo comercial que busca operações de importação/exportação na API Penta-Transaction por NCM (rubro de 4 dígitos), mostra o consumo do plano contratado e converte empresas encontradas em leads do pipeline.

## 1. Menu

Novo item **Mineração** no grupo Comercial do sidebar, **acima de Pipeline**, rota `/comercial/mineracao`, módulo `comercial` (mesmos papéis do Pipeline).

## 2. Aba "Mineração" em Configurações

Nova aba em `/admin/configuracoes?tab=mineracao` (admin):

- Usuário e senha da API (senha nunca volta para a tela — só máscara e data da última alteração).
- Configurações auxiliares: países/bases padrão, atraso entre chamadas (mínimo 500 ms exigido pela API), limite diário de consultas (1.000), e os tetos do plano: 25 bases (até 15 premium), 30 rubros de 4 dígitos, 1.000 empresas.
- Botões **Testar conexão** (healthcheck + login) e **Sincronizar limites** (lê o endpoint de restrições do contrato e atualiza os contadores reais).

## 3. Página de Mineração

**Cabeçalho de status**
- Selo Online / Offline / Em manutenção, com latência e horário da última verificação (healthcheck + login).
- Três medidores de consumo do plano, com barra e alerta em 80% e 100%:
  - Bases usadas — X / 25 (destacando quantas são premium, X / 15)
  - Rubros (NCM 4 dígitos) usados — X / 30
  - Empresas usadas — X / 1.000
  - Mais um contador de consultas do dia — X / 1.000
- Antes de disparar a busca, o sistema calcula quanto aquela consulta vai consumir de cada cota e avisa se ultrapassa; consulta que estouraria o limite é bloqueada com mensagem clara.

**Busca**
- Filtros: país/base (importações, exportações), período (máximo 12 meses), um ou mais NCM de 4 dígitos, e busca opcional por nome de empresa (usa o endpoint de apoio de parâmetros).
- Resultado em duas visões: **Empresas** (agregado por importador/exportador: nº de operações, valor total US$, principais NCM, período) e **Operações** (linhas cruas da API).
- Resultado é salvo como uma "campanha de mineração" para poder reabrir sem gastar cota de novo, com exportação CSV.

## 4. Conversão para o pipeline

- Na visão Empresas: seleção múltipla + botão **Enviar para o pipeline**.
- Para cada empresa, cria (ou reaproveita, se já existir por documento/nome) um cliente com origem de lead "Mineração Penta" e uma oportunidade no estágio inicial (suspect), já com contexto no título e uma nota com os dados minerados: NCM, volume, valor e período.
- Empresas já convertidas ficam marcadas na lista, evitando duplicidade; a oportunidade criada leva link de volta para a campanha de origem.

## Detalhes técnicos

**Banco (migração nova, com GRANTs e RLS)**
- `mineracao_config` — linha única: usuário, senha (coluna sem acesso a `anon`/`authenticated`, lida só no servidor), país padrão, delay, limites do plano, `updated_at`/`updated_by`.
- `mineracao_uso` — consumo agregado do ano: bases, bases premium, rubros e empresas já utilizados, mais consultas por dia.
- `mineracao_campanhas` e `mineracao_resultados` — histórico das buscas e das empresas/operações retornadas, com `convertido_oportunidade_id`.
- Políticas: leitura/escrita apenas para admin/manager via `has_role`; nada exposto a `anon`.

**Servidor**
- `src/lib/mineracao.functions.ts` (server fns com `requireSupabaseAuth`): `getMineracaoStatus`, `buscarBases`, `buscarEmpresas`, `executarMineracao`, `converterEmLeads`, `salvarMineracaoConfig`, `sincronizarRestricoes`.
- `src/lib/mineracao/penta.server.ts` — cliente HTTP da API v2: header `Key`, login com bearer token em cache, endpoints `available-countries`, `available-bases`, `parameter-support`, `operations`, `restrictions`, `actuator/health/api-v2`; respeita o intervalo mínimo de 500 ms entre chamadas e traduz os erros conhecidos ("credenciais incorretas", "período fora do intervalo", "limite atingido") para mensagens em português, sem citar nomes de variáveis.
- Registro no catálogo de chaves da aba Chaves & Diagnóstico, para a mineração aparecer nos testes gerais.

**Front**
- `src/routes/_authenticated/comercial.mineracao.tsx`, componentes em `src/components/comercial/mineracao/` (StatusBar, QuotaMeters, FiltrosBusca, ResultadosEmpresas, ResultadosOperacoes, ConverterLeadsDialog).
- `src/components/admin/MineracaoTab.tsx` e entrada nova na lista de abas de `admin.configuracoes.tsx`.
- Item de menu em `AppSidebar.tsx` e mapeamento em `route-modules.ts`.
