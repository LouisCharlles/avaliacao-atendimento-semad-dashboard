#!/usr/bin/env bash
# Backup do banco do Sistema de Avaliação (formato custom do pg_dump, compactado).
# Instalado por deploy/instalar.sh em /usr/local/bin/avaliacao-semad-backup (cron 02:30).
#
# Restaurar um backup (substitui os dados atuais):
#   cd /opt/avaliacao-semad
#   docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' \
#     < /var/backups/avaliacao-semad/avaliacao-AAAAMMDD-HHMM.dump
set -euo pipefail

DIR_APP="${DIR_APP:-/opt/avaliacao-semad}"
DIR_BACKUP="${DIR_BACKUP:-/var/backups/avaliacao-semad}"
RETENCAO_DIAS="${RETENCAO_DIAS:-30}"

install -d -m 700 "$DIR_BACKUP"
cd "$DIR_APP"

ARQ="$DIR_BACKUP/avaliacao-$(date +%Y%m%d-%H%M).dump"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$ARQ.tmp"
mv "$ARQ.tmp" "$ARQ"
chmod 600 "$ARQ"

find "$DIR_BACKUP" -name 'avaliacao-*.dump' -mtime +"$RETENCAO_DIAS" -delete
echo "$(date -Iseconds) backup ok: $ARQ ($(du -h "$ARQ" | cut -f1))"
