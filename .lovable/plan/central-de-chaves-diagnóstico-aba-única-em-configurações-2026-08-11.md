# Central de Chaves & Diagnóstico (aba única em Configurações)

## Problema

Hoje as chaves e conexões externas estão espalhadas: aba Integrações (provedores fiscais), aba Conectores (Firecrawl/Drive/Groq), aba Banco (Supabase), e vários pontos que leem `process.env` direto. Quando falta uma chave, o erro técnico vaza na tela — como no orçamento: "Google Drive connector não configurado (LOVABLE_API_KEY / GOOGLE_DRIVE_API_KEY ausentes)".

## O que será feito

### 1. Nova aba "Chaves & Diagnóstico" em `/admin/configuracoes`

Uma única tela que lista **todas** as chaves usadas pelo sistema, agrupadas por área:

- Banco de dados (Supabase URL, chave pública, chave de serviço, projeto)
- IA (Lovable AI Gateway, Groq, Gemini)
- Documentos & Drive (Google Drive, conta de serviço, pasta raiz)
- E-mail (Resend)
- Enriquecimento fiscal (Firecrawl, APIs.net.pe)
- Assinatura & links públicos (chaves de assinatura de documento e relatório)

Para cada item: nome amigável, para que serve, o que quebra sem ela, status (Configurada / Ausente / Inválida), valor mascarado, e latência do teste. Nunca exibe o valor.

### 2. Botão "Testar tudo" e teste individual

Cada linha tem "Testar" e o topo tem "Testar tudo", com resumo (X ok / Y ausentes / Z com erro) e data da última verificação. Os testes são reais (chamada ao provedor), reaproveitando o que já existe em `conectores.functions.ts` e no health-check de service role.

### 3. Reorganização das abas

- Abas atuais **Integrações** + **Conectores** + parte de diagnóstico do **Banco** passam a viver dentro da nova aba, em seções: "Chaves & Diagnóstico", "Provedores fiscais por país", "Conta Groq".
- Reduz de 9 para 7 abas: Administração, Geral, Contato, **Chaves & Diagnóstico**, Banco de dados, SEO, Logs de busca fiscal, Migrations.

### 4. Mensagens de erro amigáveis (fim do vazamento de nome de variável)

- Criar um catálogo único de capacidades (`capability` -> chaves exigidas, nome amigável, impacto).
- Toda falha por chave ausente passa a devolver algo como: "Sincronização com o Google Drive indisponível — a integração não está configurada. O documento foi gerado e pode ser baixado normalmente." com link para a nova aba.
- No wizard de orçamento, a sincronização com Drive vira aviso discreto (não bloqueia nem alarma), já que o PDF foi gerado com sucesso.

### 5. Testes automatizados

- Teste garantindo que nenhuma mensagem exposta ao usuário contenha nomes de variáveis de ambiente (varredura em `src/lib/**` por padrões `[A-Z_]{6,}_KEY|_TOKEN|_SECRET` dentro de `throw new Error`/mensagens retornadas).
- Testes do catálogo de capacidades: com chave ausente, a ação degrada com mensagem amigável; com chave presente, segue o fluxo.

## Detalhes técnicos

- `src/lib/system-keys.ts` — catálogo declarativo (id, label, descrição, chaves de ambiente, área, criticidade, impacto).
- `src/lib/system-diagnostics.functions.ts` — server fn admin-only: lê presença/máscara das chaves e executa probes por capacidade; reaproveita `checkConectores` e `getServiceRoleStatus`.
- `src/components/admin/DiagnosticoTab.tsx` — nova aba; absorve `IntegracoesTab` e `GroqConfigCard` como seções.
- `src/lib/docs/drive.server.ts` — lança erro tipado de capacidade indisponível, sem citar variáveis.
- Rota `admin.configuracoes.tsx` — atualizar lista de abas mantendo redirecionamento das chaves antigas (`?tab=integracoes` e `?tab=conectores` -> `?tab=diagnostico`).
- Nenhuma migração de banco necessária; nenhum valor de segredo é exposto ao cliente.
