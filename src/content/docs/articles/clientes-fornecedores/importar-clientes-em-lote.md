---
title: Importar clientes em lote
description: Como importar clientes via CSV/planilha na tela de importação.
category: clientes-fornecedores
slug: importar-clientes-em-lote
tipo: guia
nivel: intermediario
tags: [importacao, csv, clientes, lote]
papeis: [admin, manager]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Tela `/importar`, tipo **Clientes**.
- CSV UTF-8, colunas fixas, máx. **5.000 linhas** por lote.
- Preview mostra: verde = criar, amarelo = atualizar, vermelho = erro.
- Deduplicação por `país + documento`; enriquecimento roda em segundo plano.
:::

## Preparar o arquivo

Colunas mínimas (nomes exatos, primeira linha do CSV):

- `pais` (BR, AR, CL, CO, CR, PE, PY)
- `documento` (CNPJ / CUIT / RUT / NIT / RUC …)
- `razao_social`
- `nome_fantasia` (opcional)
- `email` (opcional)
- `telefone` (opcional)
- `cidade`, `estado` (opcional)

Salve como **CSV UTF-8** separado por vírgula.

:::step{n="1" title="Abrir a tela de importação" img="07-importar.png" alt="Tela Importar com seletor de tipo (Clientes / Fornecedores) e upload de CSV"}
Vá em **Importar** (`/importar`). Escolha **Clientes** como tipo de importação e faça upload do CSV.
:::

:::step{n="2" title="Conferir o preview"}
O sistema mostra cada linha com uma cor:
- **Verde** — será criado.
- **Amarelo** — já existe (por `pais + documento`) e será atualizado.
- **Vermelho** — tem erro (documento inválido, país fora da lista, campos obrigatórios em branco).
:::

:::step{n="3" title="Corrigir e importar"}
Duas opções:
- Corrigir os erros no CSV original e recarregar.
- Clicar em **Ignorar linhas com erro** e importar só as válidas.

Clique em **Importar** para confirmar.
:::

## O que o sistema faz depois

- Deduplica por `pais + documento`.
- Dispara **enriquecimento automático** em segundo plano para os novos registros.
- Registra a operação em `/admin/auditoria` (autor, arquivo, contagens).

:::dica
Divida arquivos grandes em blocos de 1.000-2.000 linhas — se algo falhar, é mais fácil corrigir e reimportar.
:::

:::atencao
Máximo **5.000 linhas** por importação. Arquivos maiores devem ser divididos ou processados via API interna (contate `admin`).
:::

## Ver também

- [Cadastrar cliente](/ajuda/documentacao/clientes-fornecedores/cadastrar-cliente)

