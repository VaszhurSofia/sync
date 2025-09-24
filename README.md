# Sync - Couple's Shared Chat MVP

A secure, AI-powered chat application designed for couples to communicate with AI reflection and clarification.

## 🏗️ Architecture

- **Mobile App**: React Native (Expo)
- **Website**: Next.js (App Router)
- **API**: Node.js + TypeScript (Fastify) + PostgreSQL
- **AI**: OpenAI with custom orchestrator
- **Security**: JWT, CORS, RLS, AES-GCM encryption

## 📁 Monorepo Structure

```
/app-mobile/     # React Native (Expo)
/website/        # Next.js site + /demo trial chat
/services/api/   # Fastify API + OpenAPI YAML
/services/ai/    # Orchestrator, prompts, evals
/packages/ui/    # Shared UI tokens/components
/packages/types/ # Shared TS types + generated client
/infra/          # DB migrations, env templates, KMS helpers
/docs/           # RFCs, runbooks, openapi.yaml
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## 🔒 Security Features

- **Encryption at rest**: AES-GCM on sensitive columns
- **EU-only resources**: All data processing in EU region
- **Delete-only retention**: No data export, only deletion
- **Safety boundaries**: AI content filtering and boundary detection
- **Turn-taking enforcement**: No simultaneous typing

## 📋 Development Milestones

- [x] M0 - Scaffold & Contracts
- [ ] M1 - Auth + Couples
- [ ] M2 - Sessions & Messages
- [ ] M3 - AI Orchestrator
- [ ] M4 - Safety & Boundary
- [ ] M5 - Survey + Delete
- [ ] M6 - Website
- [ ] M7 - Polish

## 🧪 Testing

- **Unit**: RLS, crypto, validators
- **Integration**: Long-poll correctness, boundary lock, survey, delete
- **E2E**: Full flow couple → session → AI card → boundary → survey → delete
- **Security**: CI fails if plaintext content logged
- **Performance**: 200 concurrent sessions, p95 <1.5s

## 📖 Documentation

See `/docs/` for detailed documentation including:
- API specifications (OpenAPI)
- Database schema
- Security guidelines
- Deployment procedures
