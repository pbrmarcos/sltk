---
title: Entrevistas técnicas por segmento
description: Como criar, compartilhar e acompanhar entrevistas técnicas com o cliente via link público — respostas viram insumo comercial.
category: comercial
slug: entrevistas
tipo: guia
nivel: iniciante
tags: [entrevista, formulario, publico, captacao, comercial]
papeis: [admin, manager, sales]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Crie uma entrevista em `/comercial/entrevistas` escolhendo o **segmento** (ex.: Trigo, Amendoim, Café).
- O sistema gera um **código curto** (ex.: `5CTFHG`) e um link público `entrevista/$codigo`.
- O cliente responde **sem login**, em PT/ES/EN, com autosave — as respostas ficam gravadas em português canônico.
- Depois de respondida, baixe o **PDF** direto do card; entrevistas excluídas ficam 30 dias na **Lixeira**.
:::

## Onde ficam as coisas

| O quê | Onde | Quem edita |
|---|---|---|
| **Catálogo de perguntas** (por segmento) | `/admin/entrevistas` | `admin`, `manager` |
| **Entrevistas ativas** (criar, copiar link, PDF) | `/comercial/entrevistas` | `sales`, `manager`, `admin` |
| **Formulário público** (o cliente enxerga) | `/entrevista/$codigo` | Qualquer visitante |
| **Lixeira** (30 dias, restore/purge) | `/comercial/entrevistas` → aba **Lixeira** | `manager`, `admin` para purge |

## Passo a passo — criar e compartilhar

:::step{n="1" title="Nova entrevista" img="entrevistas-lista.png" alt="Lista de entrevistas ativas em /comercial/entrevistas, com um card mostrando o código curto, o segmento e o snippet 'Mensagem para colar' com abas PT/ES/EN e os botões Copiar e Abrir"}
Em `/comercial/entrevistas`, clique **Nova entrevista** e selecione o **segmento**. Opcionalmente informe o nome do lead — ele aparece no cabeçalho do formulário público.
:::

:::step{n="2" title="Copiar o link" img="entrevistas-lista.png" alt="Card da entrevista com o bloco 'Mensagem para colar' selecionado no idioma PT e botão Copiar em destaque"}
Cada card traz a **Mensagem para colar** em três idiomas (PT, ES, EN). Alterne a aba, clique **Copiar** e cole no e-mail ou WhatsApp do cliente. O botão de link abre o formulário em nova aba para pré-visualizar.
:::

:::step{n="3" title="O cliente responde" img="entrevistas-splash.png" alt="Splash da entrevista pública mostrando a logomarca dark da SLTK Americas centralizada sobre fundo azul-marinho com barra de progresso"}
Ao abrir o link, o cliente vê a logomarca da SLTK Americas e uma barra de progresso; o formulário abre com uma animação circular assim que os dados chegam. Funciona em desktop, tablet e celular, sem instalação.
:::

:::step{n="4" title="Responder no idioma preferido" img="entrevistas-formulario.png" alt="Formulário público exibindo a pergunta atual, seletor PT/ES/EN e botões Back/Next da mesma altura ao final"}
O botão **US EN / ES / PT** no topo troca o idioma inclusive das perguntas. Respostas ficam salvas por **ID de opção**, então trocar de idioma não perde o que já foi preenchido. Autosave contínuo em `localStorage` — o cliente pode fechar e voltar no mesmo dispositivo.
:::

:::step{n="5" title="Baixar o PDF" img="entrevistas-lista.png" alt="Card de entrevista respondida com botão 'Ver respostas' habilitado para gerar o PDF no padrão do sistema"}
Assim que o lead envia, o card muda para **Respondida** e o botão **Ver respostas** libera o download do PDF (mesmo layout dos documentos do sistema).
:::

## Lixeira e auditoria

- Excluir move o registro para a aba **Lixeira**; ele fica lá 30 dias e depois é purgado.
- Qualquer usuário com acesso ao módulo pode **restaurar** dentro da janela.
- **Purge definitivo** só é permitido a `manager`/`admin` e vai para a trilha de auditoria.

:::atencao
Excluir uma entrevista **respondida** não apaga o PDF já gerado nem os anexos do cliente — o snapshot fica preservado no histórico do documento.
:::

## Editar o catálogo de perguntas

O catálogo por segmento (perguntas, opções, gatilhos de "Descreva", matriz de contato) é editado em **Admin → Formulários de Entrevista**. Veja [Formulários de Entrevista (admin)](/ajuda/documentacao/admin/formularios-entrevista).

## Ver também

- [Checklist público e formulários](/ajuda/documentacao/comercial/checklist-publico-e-formularios)
- [Pipeline de oportunidades](/ajuda/documentacao/comercial/pipeline-de-oportunidades)
- [Formulários de Entrevista (admin)](/ajuda/documentacao/admin/formularios-entrevista)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Entrevistas" img="entrevistas-1.png" alt="Entrevistas"}
Entrevistas
:::

<!-- /SHOTS:AUTO -->
