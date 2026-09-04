# Mineração de leads — busca por par comprador × vendedor

Objetivo: na tela de Mineração, o time comercial escolhe NCM(s), país de destino (quem comprou) e país de origem (quem vendeu) e recebe pares de empresas que negociaram aquele produto no período, prontos para virar suspects no pipeline.

## O que muda na tela

Reaproveitando os filtros atuais (base, NCM, período, modo empresa ↔ contraparte):

- Novo modo de consulta **"Rota comercial (origem → destino)"**, ao lado dos modos atuais.
  - **País de destino**: seleciona a base de importação daquele país automaticamente (não precisa mais escolher a base na mão nesse modo).
  - **País de origem**: lista alimentada pela própria API (parâmetro `paisCodigo` da base escolhida), com busca por nome.
  - NCM e período continuam iguais (chips de NCM, presets de período, teto de 12 meses).
- Resultado agrupado por **par (importador + fornecedor estrangeiro)** com: valor total, nº de transações, última transação, NCMs envolvidos — ordenado por valor total.
- Avisos claros no topo do resultado:
  - "Resultado truncado no limite da base (X linhas). Reduza o período ou os NCMs."
  - "Limite diário de consultas atingido" quando a API recusar por cota.
  - Nota fixa: a API devolve apenas nome/código da empresa, sem contato.
- Em cada par: botões **"Buscar contato"** (abre pesquisa externa por nome + país em nova aba) e **"Anotação"** (campo livre salvo no resultado), além de **"Enviar ao pipeline"** com escolha de qual ponta vira o lead: importador, fornecedor ou ambos.
- O suspect criado já vem pré-preenchido com nome da empresa, país, NCMs e valor histórico negociado.

## Como fica por trás

Tudo continua no backend (server functions + credenciais em RPC `SECURITY DEFINER`); o navegador nunca vê usuário, senha nem o cálculo do header `Key`.

1. **Descoberta da base** (`src/lib/mineracao.functions.ts`): nova função que chama `available-bases?country=<destino>`, escolhe a base com `keyOperation = "import"` e devolve `keyCountry`, `keyVersion`, `queryLimit` e a lista de `parameters`/colunas reais da base.
2. **Mapeamento dinâmico de colunas**: os nomes (`operadorLocal`, `operadorExtranjero`/`operadorExterior`, `valor`, `periodo`, `rubro`) passam a ser resolvidos a partir da resposta da base, com sinônimos e fallback, em vez de fixos no código.
3. **Consulta**: `POST /operations` com `parameters` = `rubro` (text, multiple) + `paisCodigo` (keyValue, multiple) para o país de origem. Um NCM por chamada só quando a base não aceitar múltiplos; caso contrário, uma chamada só.
4. **Fila com espaçamento**: as chamadas passam a ser enfileiradas numa fila serial no cliente Penta (`penta.server.ts`), com o intervalo mínimo já configurado (≥500 ms) aplicado a qualquer sequência de NCMs/países — nunca em paralelo.
5. **Token**: mantém o cache atual e passa a usar o `refreshToken` (endpoint de refresh) antes de refazer login do zero; login completo só quando o refresh falhar.
6. **Cota diária**: contador de consultas por dia gravado no banco; ao atingir o limite configurado, a busca é bloqueada com mensagem explicativa antes mesmo de chamar a API.
7. **Agregação**: chave do agrupamento = importador + fornecedor; soma de valor, contagem de transações, última data e união dos NCMs; ordenação por valor total desc.

## Banco (uma migração)

- `mineracao_campanhas`: colunas `pais_origem`, `pais_destino`, `truncado` (bool) e `limite_base`.
- `mineracao_resultados`: colunas `anotacao` (texto livre do comercial) e `papel` (importador/fornecedor) para saber qual ponta virou lead.
- Tabela/contador simples de consultas diárias para o limite de 1000/dia.
- GRANTs e políticas RLS iguais às tabelas de mineração já existentes.

## Fora do escopo

Enriquecimento automático de contato (telefone/e-mail) — só o atalho de busca externa e a anotação manual.
