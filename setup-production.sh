#!/bin/bash

# Sync Production Setup Script
# Sets up the production-ready Sync platform with all enhancements

set -e

echo "🚀 Setting up Sync Production Platform..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

success "Node.js $(node -v) is installed"

# Install dependencies
log "Installing dependencies..."
npm install
success "Dependencies installed"

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    log "Creating .env file..."
    cat > .env << EOF
# Sync Production Environment Variables

# Server Configuration
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=info

# Database (replace with your production database URL)
DATABASE_URL=postgresql://username:password@localhost:5432/sync_production

# Encryption (generate a secure key for production)
ENCRYPTION_KEY=your-secure-encryption-key-here

# JWT Secret (generate a secure secret for production)
JWT_SECRET=your-secure-jwt-secret-here

# OpenAI API Key (add your actual API key)
OPENAI_API_KEY=your-openai-api-key-here

# AI Service URL
AI_SERVICE_URL=http://localhost:3002

# Staging Configuration (set to 'true' for staging environment)
STAGING=false
STAGING_USERNAME=admin
STAGING_PASSWORD=your-secure-staging-password

# Security
NODE_ENV=production
EOF
    warning "Created .env file with default values. Please update with your actual values."
else
    success ".env file already exists"
fi

# Create staging environment file
if [ ! -f .env.staging ]; then
    log "Creating .env.staging file..."
    cat > .env.staging << EOF
# Sync Staging Environment Variables

# Server Configuration
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=debug

# Database (staging database)
DATABASE_URL=postgresql://username:password@localhost:5432/sync_staging

# Encryption (staging key)
ENCRYPTION_KEY=staging-encryption-key

# JWT Secret (staging secret)
JWT_SECRET=staging-jwt-secret

# OpenAI API Key (staging API key)
OPENAI_API_KEY=your-staging-openai-api-key

# AI Service URL
AI_SERVICE_URL=http://localhost:3002

# Staging Configuration
STAGING=true
STAGING_USERNAME=staging-admin
STAGING_PASSWORD=staging-secure-password

# Security
NODE_ENV=staging
EOF
    success "Created .env.staging file"
fi

# Build the project
log "Building the project..."
npm run build
success "Project built successfully"

# Create production start script
log "Creating production start script..."
cat > start-production.sh << 'EOF'
#!/bin/bash

# Sync Production Start Script

echo "🚀 Starting Sync Production Server..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start the production server
cd services/api
node dist/production-server.js
EOF

chmod +x start-production.sh
success "Created production start script"

# Create staging start script
log "Creating staging start script..."
cat > start-staging.sh << 'EOF'
#!/bin/bash

# Sync Staging Start Script

echo "🚧 Starting Sync Staging Server..."

# Load staging environment variables
if [ -f .env.staging ]; then
    export $(cat .env.staging | grep -v '^#' | xargs)
fi

# Start the staging server
cd services/api
node dist/production-server.js
EOF

chmod +x start-staging.sh
success "Created staging start script"

# Create test script
log "Creating test script..."
cat > test-production.sh << 'EOF'
#!/bin/bash

# Sync Production Test Script

echo "🧪 Running Production Tests..."

# Start the server in background
./start-production.sh &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Run tests
node test-production-comprehensive.js

# Stop the server
kill $SERVER_PID

echo "✅ Production tests completed"
EOF

chmod +x test-production.sh
success "Created test script"

# Create deployment checklist
log "Creating deployment checklist..."
cat > DEPLOYMENT-CHECKLIST.md << 'EOF'
# Sync Production Deployment Checklist

## Pre-Deployment

- [ ] Update `.env` with production values
- [ ] Set secure `ENCRYPTION_KEY` (32+ characters)
- [ ] Set secure `JWT_SECRET` (32+ characters)
- [ ] Add your OpenAI API key
- [ ] Configure production database URL
- [ ] Set `NODE_ENV=production`
- [ ] Set `STAGING=false`

## Security

- [ ] Enable HTTPS in production
- [ ] Configure proper CORS settings
- [ ] Set up rate limiting for production traffic
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Enable audit logging

## Database

- [ ] Set up PostgreSQL database
- [ ] Run database migrations
- [ ] Configure database backups
- [ ] Set up connection pooling
- [ ] Configure database monitoring

## Testing

- [ ] Run production tests: `./test-production.sh`
- [ ] Test crypto health endpoint
- [ ] Test turn-taking locks
- [ ] Test rate limiting
- [ ] Test safety boundaries
- [ ] Test delete functionality

## Monitoring

- [ ] Set up application monitoring
- [ ] Configure error tracking
- [ ] Set up performance monitoring
- [ ] Configure log aggregation
- [ ] Set up health checks

## Staging Environment

- [ ] Deploy to staging first
- [ ] Test all features in staging
- [ ] Verify staging controls work
- [ ] Test with staging credentials
- [ ] Validate robots.txt and no-index

## Production Deployment

- [ ] Deploy to production
- [ ] Verify all endpoints work
- [ ] Test with real users
- [ ] Monitor error rates
- [ ] Check performance metrics

## Post-Deployment

- [ ] Monitor for 24 hours
- [ ] Check error logs
- [ ] Verify all features work
- [ ] Test backup and recovery
- [ ] Document any issues
EOF

success "Created deployment checklist"

# Create README for production
log "Creating production README..."
cat > PRODUCTION-README.md << 'EOF'
# Sync Production Platform

## Quick Start

1. **Setup Environment**
   ```bash
   ./setup-production.sh
   ```

2. **Configure Environment Variables**
   - Edit `.env` with your production values
   - Set secure encryption keys and secrets
   - Add your OpenAI API key

3. **Start Production Server**
   ```bash
   ./start-production.sh
   ```

4. **Run Tests**
   ```bash
   ./test-production.sh
   ```

## Features

### 🔐 Crypto Health Monitoring
- Real-time encryption system health
- KMS connection monitoring
- DEK key status tracking
- Test vector validation

### 🎯 Turn-Taking Locks
- Prevents message flooding
- Ensures proper conversation flow
- Configurable lock duration
- Admin monitoring

### ⚡ Rate Limiting
- Multi-tier rate limiting
- Dynamic adjustment based on safety violations
- Per-endpoint configuration
- Admin controls

### 🛡️ Safety & Boundaries
- Content safety validation
- EU compliance resources
- Escalating restrictions
- Audit logging

### ♿ Accessibility
- WCAG 2.1 AA compliant
- Screen reader support
- Keyboard navigation
- High contrast support

### 🔐 Security
- Plaintext logging prevention
- Secure headers
- Staging controls
- Audit trails

## API Endpoints

### Health & Status
- `GET /health` - Basic health check
- `GET /health/crypto` - Crypto health status
- `GET /rate-limit/status` - Rate limit status
- `GET /turn-taking/status` - Turn lock status

### Authentication
- `POST /auth/request-code` - Request verification code
- `POST /auth/verify-code` - Verify code and get token
- `GET /auth/me` - Get user info

### Couples & Sessions
- `POST /couples` - Create couple
- `POST /invites` - Create invite
- `POST /invites/:code/accept` - Accept invite
- `POST /sessions` - Create session
- `POST /sessions/:id/messages` - Send message
- `GET /sessions/:id/messages` - Get messages (with long-polling)
- `DELETE /sessions/:id` - Delete session

### Safety & Survey
- `GET /safety/status` - Safety status
- `GET /safety/eu-resources` - EU resources
- `POST /sessions/:id/survey` - Submit survey
- `GET /survey/analytics` - Survey analytics

### Delete & Privacy
- `POST /delete/request` - Request data deletion
- `POST /delete/:id/confirm` - Confirm deletion
- `POST /delete/:id/execute` - Execute deletion
- `GET /delete/:id/status` - Deletion status

### Admin
- `GET /admin/turn-locks` - Active turn locks
- `GET /admin/logging-security` - Logging security status
- `POST /admin/rate-limit/reset` - Reset rate limits

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | Yes |
| `HOST` | Server host | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `ENCRYPTION_KEY` | Encryption key (32+ chars) | Yes |
| `JWT_SECRET` | JWT secret (32+ chars) | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `AI_SERVICE_URL` | AI service URL | Yes |
| `STAGING` | Enable staging mode | No |
| `STAGING_USERNAME` | Staging basic auth username | No |
| `STAGING_PASSWORD` | Staging basic auth password | No |
| `LOG_LEVEL` | Logging level | No |

## Security Considerations

1. **Encryption Keys**: Use cryptographically secure random keys
2. **JWT Secrets**: Use long, random secrets
3. **Database**: Use connection pooling and SSL
4. **Rate Limiting**: Configure appropriate limits for your traffic
5. **Monitoring**: Set up comprehensive monitoring and alerting
6. **Backups**: Regular database and configuration backups

## Monitoring

The platform includes comprehensive monitoring:

- Health check endpoints
- Crypto health monitoring
- Rate limit tracking
- Turn lock monitoring
- Safety violation tracking
- Audit logging

## Support

For production support and issues:
1. Check the health endpoints
2. Review audit logs
3. Monitor rate limit status
4. Check crypto health
5. Review error logs

## License

This is a production-ready implementation of the Sync platform.
EOF

success "Created production README"

# Final summary
echo ""
echo "🎉 Sync Production Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Edit .env with your production values"
echo "2. Run: ./start-production.sh"
echo "3. Test: ./test-production.sh"
echo "4. Review: DEPLOYMENT-CHECKLIST.md"
echo ""
echo "Files created:"
echo "✅ .env (production environment)"
echo "✅ .env.staging (staging environment)"
echo "✅ start-production.sh (production start script)"
echo "✅ start-staging.sh (staging start script)"
echo "✅ test-production.sh (test script)"
echo "✅ DEPLOYMENT-CHECKLIST.md (deployment guide)"
echo "✅ PRODUCTION-README.md (production documentation)"
echo ""
echo "Your Sync platform is ready for production deployment! 🚀"
