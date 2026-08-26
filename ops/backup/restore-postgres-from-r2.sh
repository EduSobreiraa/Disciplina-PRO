#!/bin/sh
set -eu

required() {
  name="$1"
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    echo "Variável obrigatória ausente: $name" >&2
    exit 2
  fi
}

required RESTORE_DATABASE_URL
required RESTORE_EXPECTED_DATABASE_NAME
required R2_ENDPOINT_URL
required R2_BUCKET
required R2_BACKUP_KEY
required AWS_ACCESS_KEY_ID
required AWS_SECRET_ACCESS_KEY

if [ "${RESTORE_TARGET_ENVIRONMENT:-}" != 'staging' ] && [ "${RESTORE_TARGET_ENVIRONMENT:-}" != 'drill' ]; then
  echo 'RESTORE_TARGET_ENVIRONMENT deve ser staging ou drill; produção é recusada.' >&2
  exit 2
fi
if [ "${RESTORE_CONFIRM:-}" != 'RESTORE_DISCARDABLE_DATABASE' ]; then
  echo 'Confirmação ausente: RESTORE_CONFIRM=RESTORE_DISCARDABLE_DATABASE.' >&2
  exit 2
fi
case "$RESTORE_EXPECTED_DATABASE_NAME" in
  *[!A-Za-z0-9_-]*|'')
    echo 'RESTORE_EXPECTED_DATABASE_NAME deve conter apenas letras, números, _ ou -.' >&2
    exit 2
    ;;
esac
case "$R2_BACKUP_KEY" in
  ''|/*|*'..'*)
    echo 'R2_BACKUP_KEY deve ser uma chave relativa simples.' >&2
    exit 2
    ;;
esac
: "${R2_BACKUP_CHECKSUM_KEY:=$R2_BACKUP_KEY.sha256}"
case "$R2_BACKUP_CHECKSUM_KEY" in
  ''|/*|*'..'*)
    echo 'R2_BACKUP_CHECKSUM_KEY deve ser uma chave relativa simples.' >&2
    exit 2
    ;;
esac

command -v pg_restore >/dev/null 2>&1 || { echo 'pg_restore não está disponível.' >&2; exit 2; }
command -v psql >/dev/null 2>&1 || { echo 'psql não está disponível.' >&2; exit 2; }
command -v aws >/dev/null 2>&1 || { echo 'AWS CLI não está disponível.' >&2; exit 2; }
command -v sha256sum >/dev/null 2>&1 || { echo 'sha256sum não está disponível.' >&2; exit 2; }

actual_database=$(psql "$RESTORE_DATABASE_URL" --tuples-only --no-align --set=ON_ERROR_STOP=1 --command='SELECT current_database()' | tr -d '[:space:]')
if [ "$actual_database" != "$RESTORE_EXPECTED_DATABASE_NAME" ]; then
  echo "Banco de destino inesperado: esperado $RESTORE_EXPECTED_DATABASE_NAME, recebido $actual_database." >&2
  exit 2
fi

restore_directory=$(mktemp -d)
trap 'rm -rf "$restore_directory"' EXIT HUP INT TERM
local_file="$restore_directory/$(basename "$R2_BACKUP_KEY")"
checksum_file="$restore_directory/$(basename "$R2_BACKUP_CHECKSUM_KEY")"

echo "Baixando backup: $R2_BACKUP_KEY"
aws --endpoint-url "$R2_ENDPOINT_URL" s3 cp "s3://$R2_BUCKET/$R2_BACKUP_KEY" "$local_file" --only-show-errors
aws --endpoint-url "$R2_ENDPOINT_URL" s3 cp "s3://$R2_BUCKET/$R2_BACKUP_CHECKSUM_KEY" "$checksum_file" --only-show-errors
(cd "$restore_directory" && sha256sum -c "$(basename "$checksum_file")")

echo "Restaurando em ambiente descartável: $RESTORE_TARGET_ENVIRONMENT/$actual_database"
pg_restore --dbname="$RESTORE_DATABASE_URL" --clean --if-exists --no-owner --no-privileges --exit-on-error "$local_file"

psql "$RESTORE_DATABASE_URL" --set=ON_ERROR_STOP=1 --tuples-only --no-align \
  --command="SELECT CASE WHEN to_regclass('public.internal_events') IS NOT NULL AND to_regclass('public._prisma_migrations') IS NOT NULL THEN 'ok' ELSE 'missing-required-tables' END" \
  | grep -qx 'ok'

echo 'Restore concluído e schema mínimo validado.'
