# syntax=docker/dockerfile:1.7

# =============================================================================
# Dockerfile para deploy no Coolify — TanStack Start (Node SSR)
# -----------------------------------------------------------------------------
# O projeto é publicado pela Lovable em Cloudflare Workers, mas neste self-host
# usamos o preset `node-server` do Nitro (ativado por BUILD_TARGET=node em
# vite.config.ts). Sem workerd, sem wrangler — apenas `node .output/server/index.mjs`.
#
# Não há bindings nativos (KV/D1/R2/DO/Queues). A app é SSR + HTTP ao Supabase
# + geração de PDF, totalmente compatível com Node 22.
#
# Variáveis de build (passe via --build-arg):
#   - VITE_SUPABASE_URL              (embarcada no bundle)
#   - VITE_SUPABASE_PUBLISHABLE_KEY  (embarcada no bundle)
#   - VITE_SUPABASE_PROJECT_ID       (embarcada no bundle)
#
# Variáveis de runtime (configure no Coolify como env vars do container):
#   - SUPABASE_URL
#   - SUPABASE_SERVICE_ROLE_KEY      (NUNCA expor)
#   - SUPABASE_PUBLISHABLE_KEY
#   - GOOGLE_DRIVE_*                 (se aplicável)
#   - LOVABLE_API_KEY                (se aplicável)
#   - PORT (default 3000)
#
# No Coolify, SUPABASE_SERVICE_ROLE_KEY deve ser uma variável de runtime com
# disponibilidade em produção. Não marque como build-time e não use VITE_:
# qualquer variável VITE_ é pública e pode entrar no bundle do navegador.
# Após adicionar ou trocar a credencial, faça redeploy/restart do container;
# alterar apenas o ambiente sem reiniciar mantém o processo antigo sem a chave.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: deps — instala dependências com cache
# -----------------------------------------------------------------------------
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app

COPY package.json bun.lockb* bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2: builder — gera o bundle Node SSR
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

ENV NODE_ENV=production \
    BUILD_TARGET=node

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: runner — runtime Node mínimo (alpine OK, sem workerd)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    NITRO_PORT=3000 \
    NITRO_HOST=0.0.0.0

RUN apk add --no-cache tini curl \
    && addgroup -S app -g 1001 \
    && adduser -S app -G app -u 1001

# Bundle Node SSR auto-contido (inclui node_modules necessários)
COPY --from=builder --chown=app:app /app/.output ./.output

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/api/public/health" >/dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", ".output/server/index.mjs"]
