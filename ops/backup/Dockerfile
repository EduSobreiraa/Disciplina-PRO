FROM postgres:18-alpine

RUN apk add --no-cache aws-cli curl

COPY ops/backup/backup-postgres-to-r2.sh /usr/local/bin/backup-postgres-to-r2
COPY ops/backup/restore-postgres-from-r2.sh /usr/local/bin/restore-postgres-from-r2

RUN chmod 755 /usr/local/bin/backup-postgres-to-r2 /usr/local/bin/restore-postgres-from-r2

ENTRYPOINT ["/usr/local/bin/backup-postgres-to-r2"]
