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

required DATABASE_URL
required R2_ENDPOINT_URL
required R2_BUCKET
required AWS_ACCESS_KEY_ID
required AWS_SECRET_ACCESS_KEY
required BACKUP_HEARTBEAT_URL

case "$BACKUP_HEARTBEAT_URL" in
  https://*) ;;
  *)
    echo 'BACKUP_HEARTBEAT_URL deve usar HTTPS.' >&2
    exit 2
    ;;
esac

: "${AWS_REGION:=auto}"
: "${R2_PREFIX:=disciplina-pro/postgres}"

case "$R2_PREFIX" in
  ''|/*|*'..'*)
    echo 'R2_PREFIX deve ser um caminho relativo simples.' >&2
    exit 2
    ;;
esac

command -v pg_dump >/dev/null 2>&1 || { echo 'pg_dump não está disponível.' >&2; exit 2; }
command -v aws >/dev/null 2>&1 || { echo 'AWS CLI não está disponível.' >&2; exit 2; }
command -v sha256sum >/dev/null 2>&1 || { echo 'sha256sum não está disponível.' >&2; exit 2; }
command -v curl >/dev/null 2>&1 || { echo 'curl não está disponível.' >&2; exit 2; }

backup_directory=$(mktemp -d)
trap 'rm -rf "$backup_directory"' EXIT HUP INT TERM
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
filename="disciplina-pro-${timestamp}.dump"
local_file="$backup_directory/$filename"
remote_key="$R2_PREFIX/$filename"
checksum_file="$local_file.sha256"
checksum_remote_key="$remote_key.sha256"

echo "Criando dump PostgreSQL $filename"
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file="$local_file"
checksum=$(sha256sum "$local_file" | awk '{ print $1 }')
printf '%s  %s\n' "$checksum" "$filename" > "$checksum_file"

echo "Enviando backup para R2: $remote_key"
aws --endpoint-url "$R2_ENDPOINT_URL" s3 cp "$local_file" "s3://$R2_BUCKET/$remote_key" --only-show-errors
aws --endpoint-url "$R2_ENDPOINT_URL" s3 cp "$checksum_file" "s3://$R2_BUCKET/$checksum_remote_key" --only-show-errors
aws --endpoint-url "$R2_ENDPOINT_URL" s3api head-object --bucket "$R2_BUCKET" --key "$remote_key" >/dev/null
aws --endpoint-url "$R2_ENDPOINT_URL" s3api head-object --bucket "$R2_BUCKET" --key "$checksum_remote_key" >/dev/null

curl --fail --silent --show-error --max-time 15 --retry 2 "$BACKUP_HEARTBEAT_URL" >/dev/null

echo "Backup concluído e verificado: $remote_key (SHA-256: $checksum_remote_key)"
