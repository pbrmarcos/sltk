---
title: Novo orçamento passo a passo
description: Como criar um orçamento no wizard, definir itens, condições e idioma do PDF.
category: comercial
slug: novo-orcamento
tipo: guia
nivel: iniciante
tags: [orcamento, proposta, pdf]
papeis: [admin, manager, sales]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Wizard em 4 etapas: **Cliente → Equipamentos → Condições → Revisão & gerar**.
- Gera PDF nos 3 idiomas (PT, ES, EN) com versionamento (v1.0.0, v1.1.0…).
- Cliente precisa ter **CNPJ/RUT** cadastrado antes.
- Após gerar, dá para compartilhar link público, baixar PDF ou enviar por e-mail.
:::

## Pré-requisitos

- Cliente cadastrado em **Clientes** com documento fiscal (CNPJ/RUT).
- Papel `sales`, `manager` ou `admin`.
- (Opcional) Oportunidade no pipeline para vincular.

## Passo a passo

:::step{n="1" title="Abrir o wizard" img="02-orcamento-lista.png" alt="Lista de orçamentos com botão Novo orçamento no canto superior direito"}
Vá em **Comercial → Orçamentos** e clique **+ Novo orçamento** no canto superior direito. Você chega em `/comercial/orcamento/novo`.
:::

:::step{n="2" title="Escolher o cliente" img="03-orcamento-wizard.png" alt="Passo 1 do wizard, com busca de cliente, lista de clientes cadastrados, campo de título e seletor de moeda"}
Digite razão social ou código na busca. Escolha o cliente na lista. Preencha:

- **Título** (opcional) — ex: "Linha de envase 6000 BPM".
- **Moeda** — R$ (BRL), US$ (USD) ou € (EUR). Define o template e o cálculo de impostos.

Clique **Avançar**.
:::

:::step{n="3" title="Adicionar equipamentos e itens"}
Adicione itens com quantidade, preço unitário e descrição técnica. Se o cliente já tem BOM importada, use **Importar da BOM** para trazer os itens automaticamente.

Cada item permite subitens (acessórios, serviços, spare parts) que aparecem agrupados no PDF final.
:::

:::step{n="4" title="Definir condições comerciais"}
Preencha:

- **Prazo de entrega** (dias corridos).
- **Validade da proposta** (padrão 30 dias).
- **Forma de pagamento** — parcelas, sinal, medição.
- **Frete** — CIF, FOB, ou "a combinar".
- **Garantia** — 12 meses padrão; ajuste se necessário.

A prévia do PDF atualiza à direita em tempo real conforme você digita.
:::

:::step{n="5" title="Revisar e gerar"}
Última etapa mostra totais, impostos e cláusulas. Confira o **idioma** do PDF (PT, ES, EN) — o template é aplicado automaticamente. Clique **Gerar orçamento**. O PDF é salvo em Storage e fica disponível na tela do orçamento.
:::

## Enviar ao cliente

Na tela `/comercial/orcamento/$id`:

- **Baixar PDF** — versão vigente, em cada um dos 3 idiomas.
- **Compartilhar link** — gera link público seguro (`/p/cotacao/$token`) que expira conforme configuração ([veja segurança](/ajuda/documentacao/site-publico/links-publicos-e-seguranca)).
- **E-mail transacional** — envia direto pelo domínio corporativo configurado.

:::dica
O link público economiza a leitura de e-mail e permite rastrear se o cliente abriu a proposta. Prefira compartilhar link em vez de anexar PDF por e-mail.
:::

## Erros comuns

:::erro{title="Cliente sem CNPJ/RUT"}
O wizard bloqueia no passo 1. Volte ao cadastro do cliente e complete o documento fiscal antes de continuar.
:::

:::erro{title="PDF saiu em idioma errado"}
O idioma é escolhido no passo **Revisão & gerar**, não no cadastro do cliente. Confira o seletor antes de clicar **Gerar orçamento**.
:::

:::erro{title="Item sem preço bloqueia geração"}
O wizard não deixa gerar se algum item tem `valor unitário = 0`. Preencha ou remova o item.
:::

## Ver também

- [Corrigir orçamento (nova revisão)](/ajuda/documentacao/comercial/corrigir-orcamento)
- [Converter oportunidade em orçamento](/ajuda/documentacao/comercial/converter-oportunidade-em-orcamento)
- [Fechar oportunidade — Ganho ou Perdido](/ajuda/documentacao/comercial/fechar-oportunidade)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Orçamentos" img="novo-orcamento-1.png" alt="Orçamentos"}
Orçamentos
:::

:::step{n="2" title="Novo orçamento" img="novo-orcamento-2.png" alt="Novo orçamento"}
Novo orçamento
:::

<!-- /SHOTS:AUTO -->
