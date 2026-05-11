#!/bin/bash

# Configuration
DB_CONTAINER_NAME="edunexus_db"
DB_NAME="edunexus_db"
DB_USER="edunexus_user"
BACKUP_DIR="./backups/db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/edunexus_backup_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup for $DB_NAME..."

# Execute pg_dump inside container and compress
docker exec "$DB_CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: $BACKUP_FILE"
    
    # Retention: Delete backups older than 30 days
    find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -delete
    echo "Cleaned up old backups."
else
    echo "Error: Backup failed!"
    exit 1
fi
