# Sync Documentation

This directory contains comprehensive documentation for the Sync project.

## 📋 Table of Contents

- [API Documentation](./api.md) - Complete API reference
- [Database Schema](./database.md) - Database design and migrations
- [Security Guidelines](./security.md) - Security best practices
- [Deployment Guide](./deployment.md) - How to deploy Sync
- [Development Setup](./development.md) - Local development setup
- [Architecture Overview](./architecture.md) - System architecture

## 🚀 Quick Start

1. **Environment Setup**: Copy `infra/env.example` to `.env` and configure
2. **Database**: Run migrations with `npm run db:migrate`
3. **Development**: Start with `npm run dev`
4. **API Key**: Add your OpenAI API key to the `.env` file

## 🔑 API Key Configuration

**IMPORTANT**: You need to add your OpenAI API key to the environment configuration:

1. Copy `infra/env.example` to `.env` in the project root
2. Replace `sk-your-openai-api-key-here` with your actual OpenAI API key
3. The key will be used by the AI orchestrator service

## 📁 File Structure

```
/docs/
├── README.md           # This file
├── api.md             # API documentation
├── database.md        # Database schema
├── security.md        # Security guidelines
├── deployment.md      # Deployment instructions
├── development.md     # Development setup
├── architecture.md    # System architecture
└── openapi.yaml       # OpenAPI specification
```

## 🔒 Security Notes

- Never commit API keys or secrets to version control
- Use environment variables for all sensitive configuration
- Enable RLS (Row Level Security) in production
- All sensitive data is encrypted at rest using AES-GCM
- EU-only data processing as per requirements

## 🧪 Testing

- Unit tests: `npm run test`
- Integration tests: `npm run test:integration`
- E2E tests: `npm run test:e2e`
- Security tests: `npm run test:security`

## 📞 Support

For questions or issues, please refer to the individual documentation files or create an issue in the repository.
