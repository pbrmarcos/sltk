#!/usr/bin/env bash
# Aplica todas as migrations de supabase/migrations/ no banco DESTINO
# (projeto zdrjvjwvrxwxztvrxtwp), usando DEST_SUPABASE_DB_URL.
#
# Uso:
#   DEST_SUPABASE_DB_URL="postgresql://postgres:SENHA@db.zdrjvjwvrxwxztvrxtwp.supabase.co:5432/postgres" \
#     bash scripts/migrate-dest.sh
#
# Opcional:
#   FROM=20260609011300  (aplica somente migrations >= esse prefixo)
#   DRY_RUN=1            (apenas lista os arquivos que seriam aplicados)
#
# Idempotência: cria a tabela public._migrations_applied e pula arquivos
# já registrados. Cada migration roda dentro de uma transação.
set -euo pipefail

if [[ -z "${DEST_SUPABASE_DB_URL:-}" ]]; then
  echo "ERRO: defina DEST_SUPABASE_DB_URL (string de conexão postgres do projeto destino)." >&2
  exit 1
fi

DIR="$(cd "$(dirname "$0")/.." && pwd)/supabase/migrations"
if [[ ! -d "$DIR" ]]; then
  echo "ERRO: pasta de migrations não encontrada em $DIR" >&2
  exit 1
fi

# Parse URL manualmente para evitar problemas com caracteres especiais na senha
# Formato: postgresql://USER:PASS@HOST:PORT/DB
url="${DEST_SUPABASE_DB_URL#postgresql://}"
url="${url#postgres://}"
userpass="${url%%@*}"
hostpart="${url#*@}"
PGUSER_PARSED="${userpass%%:*}"
PGPASSWORD_RAW="${userpass#*:}"
hostport="${hostpart%%/*}"
PGDATABASE_PARSED="${hostpart#*/}"
PGDATABASE_PARSED="${PGDATABASE_PARSED%%\?*}"
PGHOST_PARSED="${hostport%%:*}"
PGPORT_PARSED="${hostport#*:}"
[[ "$PGPORT_PARSED" == "$hostport" ]] && PGPORT_PARSED=5432

# URL-decode da senha via python (lida com % literal de forma segura)
export PGPASSWORD="$(python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))" "$PGPASSWORD_RAW")"
export PGHOST="$PGHOST_PARSED"
export PGPORT="$PGPORT_PARSED"
export PGUSER="$PGUSER_PARSED"
export PGDATABASE="$PGDATABASE_PARSED"

PSQL=(psql -v ON_ERROR_STOP=1 -X -q)

echo "==> Garantindo tabela de controle public._migrations_applied no destino"
"${PSQL[@]}" <<'SQL'
create table if not exists public._migrations_applied (
  filename text primary key,
  applied_at timestamptz not null default now()
);
SQL

APPLIED_COUNT=0
SKIPPED_COUNT=0

shopt -s nullglob
for file in $(ls "$DIR"/*.sql | sort); do
  name="$(basename "$file")"

  if [[ -n "${FROM:-}" ]] && [[ "$name" < "$FROM" ]]; then
    continue
  fi

  already=$("${PSQL[@]}" -tA -c "select 1 from public._migrations_applied where filename = '$name' limit 1" || true)
  if [[ "$already" == "1" ]]; then
    SKIPPED_COUNT=$((SKIPPED_COUNT+1))
    continue
  fi

  if [[ "${DRY_RUN:-0}" == "1" ]]; then
    echo "[dry-run] aplicaria: $name"
    continue
  fi

  echo "==> Aplicando $name"
  # transação por arquivo: ou aplica tudo, ou nada
  "${PSQL[@]}" --single-transaction \
    -c "\set ON_ERROR_STOP on" \
    -f "$file" \
    -c "insert into public._migrations_applied(filename) values ('$name');"
  APPLIED_COUNT=$((APPLIED_COUNT+1))
done

echo ""
echo "Concluído. Aplicadas: $APPLIED_COUNT | Já existentes: $SKIPPED_COUNT"