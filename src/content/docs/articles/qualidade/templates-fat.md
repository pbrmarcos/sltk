---
title: Templates de FAT
description: Como manter os modelos de checklist que padronizam a inspeção final por família de equipamento.
category: qualidade
slug: templates-fat
tipo: guia
nivel: intermediario
tags: [fat, template, checklist, qualidade]
papeis: [admin, manager, quality]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Template = **checklist mestre** para uma família de equipamento.
- Reutilizado em cada FAT novo — garante padrão entre projetos.
- Só `manager` / `admin` publica; `quality` propõe alterações.
- Alterar template **não** afeta FATs já em andamento — só os próximos.
:::

## Passo a passo

:::step{n="1" title="Abrir a lista de FATs" img="01-fat-lista.png" alt="Tela FAT com botão Novo FAT no topo"}
Menu **QUALIDADE → FAT**. Clique **+ Novo FAT** para ver os templates disponíveis (dropdown "Template").
:::

:::step{n="2" title="Ver templates existentes" img="02-fat-novo.png" alt="Formulário Novo FAT com seleção de template, equipamento, cliente e responsáveis"}
No formulário de novo FAT, o dropdown **Template** lista todos os templates ativos por família (envasadora, transportador, painel, etc.). Cada item mostra a versão publicada.
:::

:::step{n="3" title="Criar/editar template (admin)"}
Em **ADMINISTRAÇÃO → Configurações → Templates de FAT** você mantém os modelos:

- **Nome** e **família** de equipamento.
- **Seções** — Estrutural, Elétrica, Hidráulica, Segurança, Funcional.
- **Itens** por seção — descrição, tipo (visual/medição/ensaio), evidência obrigatória, critério de aceitação.
:::

:::step{n="4" title="Versionar antes de publicar"}
Toda mudança gera uma **versão nova** (v1.2, v1.3…). A versão anterior fica arquivada para consulta em FATs antigos. O botão **Publicar** troca a versão ativa para os próximos FATs.
:::

:::step{n="5" title="Aplicar num FAT novo"}
Ao criar o FAT (próximo artigo), o `quality` escolhe o template — o checklist já vem preenchido, só falta executar.
:::

:::dica
Mantenha 1 template por família (não por projeto). Se um projeto exige itens específicos, herde o template e **adicione itens** só no FAT — isso não polui o template mestre.
:::

:::atencao
Alterar template durante a semana do FAT é perigoso — inconsistência entre equipe. Publique com pelo menos uma semana de antecedência.
:::

## Ver também

- [Agendar e preparar FAT](/ajuda/documentacao/qualidade/agendar-e-preparar-fat)
- [Executar FAT](/ajuda/documentacao/qualidade/executar-fat)
