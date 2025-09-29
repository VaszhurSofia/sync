#!/bin/bash

# Backup and Restore Script for Sync Production
# Handles database backups, file backups, and disaster recovery

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/backups/sync"
RETENTION_DAYS=30
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
LOG_FILE="/var/log/sync-backup.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Create backup directory
create_backup_dir() {
    log "📁 Creating backup directory..."
    mkdir -p "$BACKUP_DIR"/{database,files,volumes,configs}
    success "Backup directory created"
}

# Backup database
backup_database() {
    log "🗄️  Backing up database..."
    
    local backup_file="$BACKUP_DIR/database/sync_db_$(date +%Y%m%d_%H%M%S).sql"
    
    # Check if PostgreSQL is running
    if ! docker-compose -f "$DOCKER_COMPOSE_FILE" ps postgres | grep -q "Up"; then
        error "PostgreSQL is not running"
    fi
    
    # Create database backup
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_dump \
        -U sync_user \
        -d sync_production \
        --verbose \
        --no-password \
        --format=custom \
        --compress=9 \
        --file="/tmp/backup.sql"
    
    # Copy backup from container
    docker-compose -f "$DOCKER_COMPOSE_FILE" cp postgres:/tmp/backup.sql "$backup_file"
    
    # Clean up container
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres rm -f /tmp/backup.sql
    
    # Verify backup
    if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        success "Database backup completed: $backup_file"
    else
        error "Database backup failed"
    fi
}

# Backup application files
backup_files() {
    log "📄 Backing up application files..."
    
    local backup_file="$BACKUP_DIR/files/sync_files_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    # Backup application code
    tar -czf "$backup_file" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=dist \
        --exclude=coverage \
        --exclude=*.log \
        .
    
    # Verify backup
    if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        success "Files backup completed: $backup_file"
    else
        error "Files backup failed"
    fi
}

# Backup Docker volumes
backup_volumes() {
    log "🐳 Backing up Docker volumes..."
    
    local backup_file="$BACKUP_DIR/volumes/sync_volumes_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    # Get volume names
    volumes=$(docker volume ls --format "{{.Name}}" | grep sync)
    
    if [ -n "$volumes" ]; then
        # Create volume backup
        docker run --rm \
            -v /var/lib/docker/volumes:/backup \
            -v "$BACKUP_DIR/volumes:/output" \
            alpine:latest \
            tar -czf "/output/sync_volumes_$(date +%Y%m%d_%H%M%S).tar.gz" \
            -C /backup \
            $(echo "$volumes" | tr '\n' ' ')
        
        success "Volumes backup completed: $backup_file"
    else
        warning "No volumes found to backup"
    fi
}

# Backup configuration files
backup_configs() {
    log "⚙️  Backing up configuration files..."
    
    local backup_file="$BACKUP_DIR/configs/sync_configs_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    # Backup configuration files
    tar -czf "$backup_file" \
        docker-compose.prod.yml \
        nginx/ \
        monitoring/ \
        scripts/ \
        .env.production \
        /etc/nginx/ \
        /etc/ssl/ \
        2>/dev/null || true
    
    # Verify backup
    if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        success "Configs backup completed: $backup_file"
    else
        warning "Configs backup completed with warnings"
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "🧹 Cleaning up old backups..."
    
    # Clean database backups
    find "$BACKUP_DIR/database" -name "*.sql" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Clean file backups
    find "$BACKUP_DIR/files" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Clean volume backups
    find "$BACKUP_DIR/volumes" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Clean config backups
    find "$BACKUP_DIR/configs" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    success "Old backups cleaned up (retention: $RETENTION_DAYS days)"
}

# Restore database
restore_database() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        error "Backup file not specified"
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi
    
    log "🔄 Restoring database from: $backup_file"
    
    # Stop services
    log "Stopping services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" stop api website
    
    # Wait for connections to close
    sleep 10
    
    # Restore database
    log "Restoring database..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_restore \
        -U sync_user \
        -d sync_production \
        --verbose \
        --no-password \
        --clean \
        --if-exists \
        "$backup_file"
    
    # Start services
    log "Starting services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" start api website
    
    success "Database restored successfully"
}

# Restore files
restore_files() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        error "Backup file not specified"
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi
    
    log "🔄 Restoring files from: $backup_file"
    
    # Create temporary directory
    local temp_dir=$(mktemp -d)
    
    # Extract backup
    tar -xzf "$backup_file" -C "$temp_dir"
    
    # Copy files back
    cp -r "$temp_dir"/* .
    
    # Clean up
    rm -rf "$temp_dir"
    
    success "Files restored successfully"
}

# Restore volumes
restore_volumes() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        error "Backup file not specified"
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi
    
    log "🔄 Restoring volumes from: $backup_file"
    
    # Stop services
    log "Stopping services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Restore volumes
    docker run --rm \
        -v /var/lib/docker/volumes:/backup \
        -v "$(dirname "$backup_file"):/input" \
        alpine:latest \
        tar -xzf "/input/$(basename "$backup_file")" -C /backup
    
    # Start services
    log "Starting services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    success "Volumes restored successfully"
}

# List available backups
list_backups() {
    log "📋 Available backups:"
    
    echo "Database backups:"
    ls -la "$BACKUP_DIR/database/" 2>/dev/null || echo "  No database backups found"
    
    echo "File backups:"
    ls -la "$BACKUP_DIR/files/" 2>/dev/null || echo "  No file backups found"
    
    echo "Volume backups:"
    ls -la "$BACKUP_DIR/volumes/" 2>/dev/null || echo "  No volume backups found"
    
    echo "Config backups:"
    ls -la "$BACKUP_DIR/configs/" 2>/dev/null || echo "  No config backups found"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        error "Backup file not specified"
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi
    
    log "🔍 Verifying backup: $backup_file"
    
    # Check file size
    local file_size=$(stat -c%s "$backup_file")
    if [ "$file_size" -eq 0 ]; then
        error "Backup file is empty"
    fi
    
    # Check file type and integrity
    if [[ "$backup_file" == *.sql ]]; then
        # Database backup
        if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_restore --list "$backup_file" > /dev/null 2>&1; then
            success "Database backup is valid"
        else
            error "Database backup is corrupted"
        fi
    elif [[ "$backup_file" == *.tar.gz ]]; then
        # Archive backup
        if tar -tzf "$backup_file" > /dev/null 2>&1; then
            success "Archive backup is valid"
        else
            error "Archive backup is corrupted"
        fi
    else
        warning "Unknown backup file type"
    fi
}

# Main function
main() {
    case "${1:-backup}" in
        "backup")
            log "💾 Starting backup process..."
            create_backup_dir
            backup_database
            backup_files
            backup_volumes
            backup_configs
            cleanup_old_backups
            success "🎉 Backup process completed successfully!"
            ;;
        "restore-db")
            restore_database "$2"
            ;;
        "restore-files")
            restore_files "$2"
            ;;
        "restore-volumes")
            restore_volumes "$2"
            ;;
        "list")
            list_backups
            ;;
        "verify")
            verify_backup "$2"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        *)
            echo "Usage: $0 {backup|restore-db|restore-files|restore-volumes|list|verify|cleanup} [backup_file]"
            echo ""
            echo "Commands:"
            echo "  backup              - Create full backup"
            echo "  restore-db FILE     - Restore database from backup"
            echo "  restore-files FILE  - Restore files from backup"
            echo "  restore-volumes FILE- Restore volumes from backup"
            echo "  list                - List available backups"
            echo "  verify FILE         - Verify backup integrity"
            echo "  cleanup             - Clean old backups"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
