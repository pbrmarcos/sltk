# Guia de Uso Rápido — Solutek Hub

Guia direto ao ponto por módulo: **para que serve**, **onde acessar**, **como fazer o principal** e **atalhos úteis**. Para visão detalhada, ver `docs/mapa-sistema.md`.

Módulos cobertos: Conta · Comercial · Clientes/Fornecedores · Importação · Engenharia · Compras · Qualidade · Pós-vendas · Produção · Logística & Embarque · Documentos · Know-how · Ajuda · Administração.

> Módulos que não constavam em `mapa-sistema.md` e agora aparecem aqui: **Importação**, **Know-how** e **Ajuda**.

---

## 1. Conta

- **Acesso**: `/conta`
- **Fazer login**: `/auth` → e-mail + senha. "Esqueci a senha" envia link para `/reset-password`.
- **Trocar avatar/senha**: `/conta` → editar campos e salvar.
- **Sair de todas as sessões**: `/conta` → aba Sessões → "Encerrar todas".
- **Atalho**: após login, o sistema respeita o parâmetro `?redirect=` (mesma origem) ou vai para `/dashboard`.

## 2. Comercial

- **Acesso**: `/comercial/pipeline` (kanban) · `/comercial/orcamento` (lista)
- **Nova oportunidade**: pipeline → "+" no estágio → cliente/lead → equipamento → escopo.
- **Novo orçamento**: `/comercial/orcamento/novo` → wizard (cliente, itens, condições, idioma pt/es/en) → gerar PDF.
- **Corrigir orçamento**: abrir `/comercial/orcamento/$id` → botão **Corrigir** → duplica versão preservando histórico.
- **Link público de RFQ**: `/comercial/formularios-rfq` → copiar link `/rfq/$slug` do equipamento.
- **Atalho**: kanban tem drag-and-drop entre estágios; `ganho` dispara o modal de conversão em processo.

## 3. Clientes & Fornecedores

- **Acesso**: `/clientes` · `/fornecedores`
- **Novo cliente**: `/clientes/novo` (CNPJ/razão/contatos).
- **Ficha 360º**: `/clientes/$codigo` → abas Oportunidades, Processos, Contatos, Documentos.
- **Novo fornecedor / homologar**: `/fornecedores/novo` → preencher categorias → marcar `homologado` na ficha.
- **Atalho**: buscar por CNPJ na lista para evitar duplicidade antes de cadastrar.

## 4. Importação (CSV em lote)

- **Acesso**: `/importar`
- **Fazer**: escolher tipo (clientes/fornecedores) → baixar template CSV → preencher → subir → revisar preview → confirmar.
- **Regras**: linhas com erro ficam destacadas no preview; a importação só grava se todas passarem na validação.
- **Atalho**: cabeçalhos devem seguir exatamente o template — não renomear colunas.

## 5. Engenharia

- **Acesso**: `/engenharia/etp` · `/engenharia/etapas` · `/engenharia/mecanico` · `/engenharia/eletrico` · `/engenharia/hh` · `/engenharia/projetos`
- **Criar ETP a partir de orçamento aprovado**: `/engenharia/etp` → **Novo ETP** → escolher orçamento.
- **Avançar etapa**: `/engenharia/etapas` → arrastar card entre colunas.
- **Apontar H/H**: `/engenharia/hh` → selecionar projeto + data + horas.
- **Atalho**: `/engenharia/projetos` consolida progresso e libera para compras/produção.

## 6. Compras

- **Acesso**: `/compras/solicitacao` · `/compras/cotacoes` · `/compras/ordens`
- **Solicitação → Cotação → OC**: `/compras/solicitacao` (vem de engenharia) → `/compras/cotacoes/nova` (múltiplos fornecedores) → **Gerar OC** → aprovar → `/compras/ordens/$id/imprimir`.
- **Imprimir OC**: abrir `/compras/ordens/$id` → **Imprimir** (PDF via edge function).
- **Auditoria**: `/admin/auditoria` filtra por `ordens_compra`.

## 7. Qualidade

- **Acesso**: `/qualidade/revisao-mecanica` · `/qualidade/revisao-eletrica` · `/qualidade/fat`
- **Novo FAT**: `/qualidade/fat/novo` → projeto → checklist → data.
- **Executar FAT**: `/qualidade/fat/$id` → marcar itens, anexar fotos, homologar/rejeitar.
- **Atalho**: FAT reprovado pode gerar SAT/chamado direto pelo botão de ação.

## 8. Pós-vendas

- **Acesso**: `/pos-vendas` · `/pos-vendas/chamados` · `/pos-vendas/sat`
- **Abrir chamado interno**: `/pos-vendas/chamados` → **Novo** → cliente, prioridade, descrição. SLA calcula automaticamente.
- **Cliente responde**: cada chamado tem link público `/chamado/$token` enviado por e-mail.
- **Converter chamado em SAT**: `/pos-vendas/chamados/$id` → ação **Gerar SAT**.
- **Atalho**: SLA configurado em `/admin/sla-chamados`.

## 9. Produção

- **Acesso**: `/producao/montagem`
- **Avançar etapa**: kanban → arrastar card. Anexar evidências pelo botão do card.
- **Handoff para qualidade**: última coluna dispara notificação para o time de FAT.

## 10. Logística & Embarque

- **Acesso**: `/logistica/embarques`
- **Novo embarque**: **Novo** → cliente, transportadora, previsão de saída, itens (quantidade/peso/volume).
- **Filtrar grid**: busca livre + filtros por cliente, transportadora, status, faixa de datas.
- **Alterar status**: no detalhe → botão do próximo estado. Transições `embarcado`, `entregue`, `cancelado` **exigem motivo (≥ 5 caracteres)** e aceitam anexos.
- **Exportar romaneio (PDF)**: `/logistica/embarques/$id` → **Exportar PDF** → selecionar anexos (imagens viram páginas, demais arquivos entram como referência).
- **Exportar trilha de auditoria**: seção "Trilha de auditoria" → **Exportar** → CSV (Excel) ou PDF.
- **Atalho**: cada mudança de status grava linha imutável em `logistica_embarque_status_log` com autor, data e anexos.

## 11. Documentos & Templates

- **Acesso**: `/central-documentos` · `/documentos` · `/template-documentos`
- **Criar a partir de template**: `/template-documentos` → escolher → **Usar** → preencher variáveis → salvar em `/documentos`.
- **Anexar a projeto/chamado**: dentro do registro do projeto/chamado → aba Documentos → **Vincular existente**.
- **Exportar PDF**: abrir documento → **Exportar**.

## 12. Know-how

- **Acesso**: `/know-how`
- **Novo artigo**: `/know-how/novo` → título, categoria, corpo (markdown), tags.
- **Ler**: `/know-how` → busca por título/tag → abrir slug.
- **Revisar pendências**: `/know-how/revisar` (curadores) → aprovar/pedir ajuste.
- **Uso típico**: base de conhecimento técnico interno (procedimentos, decisões, aprendizados de campo).

## 13. Ajuda (documentação para o usuário final)

- **Acesso**: `/ajuda`
- **Buscar artigo**: `/ajuda/documentacao` → escolher categoria → abrir slug.
- **FAQ**: `/ajuda/faq`.
- **Diferença vs. Know-how**: Ajuda = manual do sistema (como usar); Know-how = conhecimento técnico do negócio.

## 14. Administração

- **Acesso**: `/admin` (menu de categorias à esquerda, filtrado pelo seu papel).
- **Convidar usuário**: `/admin/usuarios` → aba Usuários → **Novo** → e-mail + papéis (pode ter mais de um).
- **Redefinir senha de outro usuário**: admin usa a ação por linha em `/admin/usuarios`; manager/engineer usam a aba "Redefinir senha" da mesma tela.
- **Alterar SLA**: `/admin/sla-chamados` → por prioridade.
- **Configurar empresa/tema/SEO padrão**: `/admin/geral`.
- **Painel administrativo (KPIs)**: `/admin/configuracoes`.
- **Auditoria**: `/admin/auditoria` — filtro por tabela, usuário, período.
- **CMS do site**: `/admin/paginas-equipamentos` (blocos + SEO por equipamento).
- **Tipos de Checklist / segmentos de Entrevista**: `/admin/modelos-formulario`.
- **Chaves e status das integrações externas**: `/admin/diagnostico`.
- **Design system / changelog**: `/design-system`, `/changelog`.

---

## Atalhos globais

- **Sidebar**: agrupado por área; ícone indica módulo.
- **Busca rápida**: campo no topo de grids (clientes, fornecedores, embarques, chamados).
- **Notificações**: sino no topo — clique leva ao registro relacionado.
- **Perfil**: avatar no canto → **Minha conta** / **Sair**.
