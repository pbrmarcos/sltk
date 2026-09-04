# Popups com rascunho persistente e campos consistentes

## Objetivo
Evitar que formulários em popups fechem e percam dados ao alternar telas, abas ou rotas. O conteúdo digitado deve permanecer até ser salvo ou explicitamente descartado. Também corrigir as proporções dos campos de enriquecimento da oportunidade mostrados nas imagens.

## Implementação

### 1. Criar um padrão compartilhado de rascunho
- Criar um hook reutilizável para formulários em diálogo, com chave isolada por usuário, tipo de formulário e registro editado.
- Restaurar o rascunho ao reabrir o mesmo formulário, inclusive depois de sair da rota e voltar.
- Persistir somente valores serializáveis dos campos; arquivos selecionados não serão armazenados no navegador.
- Não substituir dados mais recentes do banco por um rascunho vazio ou pertencente a outro registro.
- Expor operações padronizadas de salvar, restaurar, descartar e limpar após sucesso.

### 2. Proteger fechamento e navegação
- Detectar alterações reais comparando o formulário atual com seu estado inicial/restaurado.
- Interceptar fechar pelo X, clique fora, Escape, botão Cancelar e navegação para outra tela quando houver alterações.
- Mostrar uma confirmação clara com duas ações: **Continuar editando** e **Descartar alterações**.
- Ao simplesmente sair da tela ou trocar de aba, manter o rascunho e restaurar o popup/formulário no retorno quando aplicável.
- Limpar o rascunho somente após salvamento bem-sucedido ou confirmação explícita de descarte.

### 3. Corrigir primeiro o popup da oportunidade
- Preservar oportunidade aberta, aba interna selecionada e campos de edição/enriquecimento ao sair do Pipeline e voltar.
- Impedir que a atualização dos dados da oportunidade reinicialize um rascunho já restaurado.
- Manter rascunhos separados para cada oportunidade e para **Nova oportunidade**.
- Ajustar o bloco **Enriquecer dados da empresa**: seletor de país mais largo, campo de documento com largura flexível, botão estável e todos com a mesma altura.
- Em telas estreitas, empilhar os controles sem cortes; em desktop, manter país, documento e ação na mesma linha.

### 4. Aplicar aos demais formulários em popup
- Auditar os diálogos e drawers de Comercial, Clientes, Engenharia, Compras, Produção, Qualidade, Administração, RFQ, Templates, Conta e Compartilhamento.
- Aplicar o padrão aos popups que contêm entrada ou edição de dados e hoje mantêm estado apenas no componente.
- Preservar o comportamento de popups apenas informativos, confirmações destrutivas e seletores temporários, sem criar rascunhos desnecessários.
- Substituir resets executados em qualquer fechamento por limpeza condicionada a sucesso ou descarte confirmado.

### 5. Consistência visual dos campos
- Uniformizar altura de inputs, selects, datas e botões que compartilham a mesma linha.
- Corrigir grids rígidos que comprimem conteúdo, usando colunas responsivas com largura mínima.
- Validar que labels, placeholders, datas e textos longos não sejam cortados em desktop e mobile.

## Validação
- Testar no Pipeline: preencher campos, trocar aba interna, fechar/reabrir, sair da rota e voltar, atualizar a página, salvar e descartar.
- Confirmar que salvar limpa o rascunho e que cancelar/fechar exige descarte quando houver alterações.
- Testar rascunhos simultâneos em duas oportunidades para garantir isolamento.
- Testar uma amostra representativa de cada área auditada, além dos fluxos de criação e edição mais críticos.
- Verificar responsividade do bloco de enriquecimento e ausência de erros no console.

## Detalhes técnicos
- Persistência local no navegador, com chaves identificadas pelo usuário autenticado e pelo formulário/registro; nenhum segredo ou arquivo binário será armazenado.
- Integração com o bloqueio de navegação do TanStack Router e com os eventos de fechamento do Radix Dialog.
- Sem alteração de banco ou das regras de negócio dos formulários.