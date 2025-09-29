#!/bin/bash

# Production Deployment Script
# This script handles the complete production deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
BACKUP_DIR="/backups/sync"
LOG_FILE="/var/log/sync-deployment.log"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"

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

# Pre-deployment checks
pre_deployment_checks() {
    log "🔍 Running pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running"
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose > /dev/null 2>&1; then
        error "Docker Compose is not installed"
    fi
    
    # Check if required environment variables are set
    required_vars=(
        "DB_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "ENCRYPTION_KEY"
        "KMS_KEY_ID"
        "OPENAI_API_KEY"
        "SENTRY_DSN"
        "GRAFANA_PASSWORD"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    # Check disk space
    available_space=$(df / | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 10485760 ]; then  # 10GB in KB
        warning "Low disk space: $(df -h / | awk 'NR==2 {print $4}') available"
    fi
    
    # Check memory
    total_mem=$(free -m | awk 'NR==2{print $2}')
    if [ "$total_mem" -lt 4096 ]; then  # 4GB
        warning "Low memory: ${total_mem}MB available (recommended: 4GB+)"
    fi
    
    success "Pre-deployment checks passed"
}

# Backup existing data
backup_data() {
    log "💾 Creating backup of existing data..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log "Backing up PostgreSQL database..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_dump -U sync_user sync_production > "$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"
        success "Database backup completed"
    else
        warning "PostgreSQL not running, skipping database backup"
    fi
    
    # Backup application data
    if [ -d "/var/lib/docker/volumes" ]; then
        log "Backing up Docker volumes..."
        tar -czf "$BACKUP_DIR/volumes_backup_$(date +%Y%m%d_%H%M%S).tar.gz" -C /var/lib/docker/volumes .
        success "Volumes backup completed"
    fi
    
    # Clean old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
    
    success "Backup completed"
}

# Build and deploy services
deploy_services() {
    log "🚀 Deploying services..."
    
    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Build custom images
    log "Building custom images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
    
    # Stop existing services
    log "Stopping existing services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans
    
    # Start services
    log "Starting services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    check_service_health
    
    success "Services deployed successfully"
}

# Check service health
check_service_health() {
    log "🏥 Checking service health..."
    
    services=("postgres" "redis" "api" "website" "nginx")
    
    for service in "${services[@]}"; do
        log "Checking $service..."
        
        # Wait for service to be ready
        timeout=60
        while [ $timeout -gt 0 ]; do
            if docker-compose -f "$DOCKER_COMPOSE_FILE" ps "$service" | grep -q "Up"; then
                success "$service is running"
                break
            fi
            sleep 2
            timeout=$((timeout - 2))
        done
        
        if [ $timeout -le 0 ]; then
            error "$service failed to start"
        fi
    done
    
    # Test API endpoint
    log "Testing API endpoint..."
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        success "API is responding"
    else
        error "API health check failed"
    fi
    
    # Test website
    log "Testing website..."
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        success "Website is responding"
    else
        error "Website health check failed"
    fi
}

# Run database migrations
run_migrations() {
    log "🗄️  Running database migrations..."
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_isready -U sync_user -d sync_production > /dev/null 2>&1; then
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        error "Database is not ready"
    fi
    
    # Run migrations
    log "Running database migrations..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T api npm run db:migrate
    
    success "Database migrations completed"
}

# Setup monitoring
setup_monitoring() {
    log "📊 Setting up monitoring..."
    
    # Wait for monitoring services
    log "Waiting for monitoring services..."
    sleep 30
    
    # Check Prometheus
    if curl -f http://localhost:9090 > /dev/null 2>&1; then
        success "Prometheus is running"
    else
        warning "Prometheus is not responding"
    fi
    
    # Check Grafana
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        success "Grafana is running"
    else
        warning "Grafana is not responding"
    fi
    
    success "Monitoring setup completed"
}

# Security hardening
security_hardening() {
    log "🔒 Applying security hardening..."
    
    # Update system packages
    log "Updating system packages..."
    apt-get update && apt-get upgrade -y
    
    # Configure firewall
    log "Configuring firewall..."
    ufw allow 22/tcp   # SSH
    ufw allow 80/tcp   # HTTP
    ufw allow 443/tcp  # HTTPS
    ufw --force enable
    
    # Set up fail2ban
    log "Setting up fail2ban..."
    apt-get install -y fail2ban
    systemctl enable fail2ban
    systemctl start fail2ban
    
    # Configure log rotation
    log "Configuring log rotation..."
    cat > /etc/logrotate.d/sync << EOF
/var/log/sync-deployment.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
    
    success "Security hardening completed"
}

# Performance optimization
optimize_performance() {
    log "⚡ Optimizing performance..."
    
    # Configure system limits
    log "Configuring system limits..."
    cat >> /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
EOF
    
    # Configure kernel parameters
    log "Configuring kernel parameters..."
    cat >> /etc/sysctl.conf << EOF
# Network optimizations
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 65536 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr

# File system optimizations
fs.file-max = 2097152
vm.max_map_count = 262144
EOF
    
    sysctl -p
    
    success "Performance optimization completed"
}

# Post-deployment validation
post_deployment_validation() {
    log "✅ Running post-deployment validation..."
    
    # Test all endpoints
    endpoints=(
        "http://localhost:3001/health"
        "http://localhost:3001/health/crypto"
        "http://localhost:3000"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log "Testing $endpoint..."
        if curl -f "$endpoint" > /dev/null 2>&1; then
            success "$endpoint is responding"
        else
            error "$endpoint is not responding"
        fi
    done
    
    # Check service logs for errors
    log "Checking service logs for errors..."
    services=("api" "website" "nginx")
    
    for service in "${services[@]}"; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" logs "$service" | grep -i error | head -5; then
            warning "Errors found in $service logs"
        else
            success "$service logs are clean"
        fi
    done
    
    success "Post-deployment validation completed"
}

# Main deployment function
main() {
    log "🚀 Starting production deployment for environment: $ENVIRONMENT"
    
    # Run deployment steps
    pre_deployment_checks
    backup_data
    deploy_services
    run_migrations
    setup_monitoring
    security_hardening
    optimize_performance
    post_deployment_validation
    
    success "🎉 Production deployment completed successfully!"
    
    # Display service URLs
    log "📋 Service URLs:"
    echo "  • Website: https://sync.com"
    echo "  • API: https://api.sync.com"
    echo "  • Monitoring: https://monitoring.sync.com"
    echo "  • Grafana: https://monitoring.sync.com"
    echo "  • Prometheus: https://monitoring.sync.com/prometheus"
    
    # Display useful commands
    log "🔧 Useful commands:"
    echo "  • View logs: docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
    echo "  • Restart services: docker-compose -f $DOCKER_COMPOSE_FILE restart"
    echo "  • Stop services: docker-compose -f $DOCKER_COMPOSE_FILE down"
    echo "  • Update services: docker-compose -f $DOCKER_COMPOSE_FILE pull && docker-compose -f $DOCKER_COMPOSE_FILE up -d"
}

# Run main function
main "$@"
