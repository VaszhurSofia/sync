# Master Prompt for Cursor - Sync (Expert Edition)

You are building **Sync**, a couple's shared chat MVP. Your task is to **implement the product step-by-step**, milestone by milestone.

⚠️ **RULE**: After completing each milestone, you must STOP, show me a checklist of what you did, provide code/tests/docs/demos, and explicitly ASK for my approval before starting the next milestone. Never skip or merge milestones.

## 🎯 Core MVP Scope

- **Shared couple chat** with AI reflection → clarification → optional micro-actions
- **Strict safety boundaries**, EU resources only, delete-only retention
- **Turn-taking enforcement** (no simultaneous typing)
- **Mobile-first** with optional web demo
- **Production-ready** with proper security, testing, and deployment

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

## 🚀 Development Milestones

### M1: Foundation (API + Auth + Basic Chat)
- PostgreSQL setup with RLS
- JWT authentication
- Basic message CRUD
- Simple AI integration
- **Deliverable**: Working API with auth

### M2: Turn-Taking + Long-Polling
- Session state machine
- Real-time message sync
- Turn-taking enforcement
- **Deliverable**: Two-device chat flow

### M3: AI Orchestrator + Safety
- Custom AI prompt engineering
- Safety boundary detection
- Response validation
- **Deliverable**: AI-powered conversation flow

### M4: Safety & Boundary System
- Tier-1 content filtering
- Safety templates
- EU support resources
- Frontend safety locks
- **Deliverable**: Production-ready safety system

### M5: Survey + Delete
- 3-emoji feedback system
- Hard delete functionality
- Survey analytics
- **Deliverable**: User feedback and data deletion

### M6: Website (Next.js)
- Demo chat interface
- Staging gates
- Theme system
- **Deliverable**: Web demo with staging protection

### M7: Polish
- Accessibility (WCAG AA)
- Rate limiting
- Copy review
- Comprehensive testing
- **Deliverable**: Production-ready application

## 🔒 Security Requirements

- **Encryption at rest**: AES-GCM on sensitive columns
- **EU-only resources**: All data processing in EU region
- **Delete-only retention**: No data export, only deletion
- **Safety boundaries**: AI content filtering and boundary detection
- **Turn-taking enforcement**: No simultaneous typing

## 🛠️ Technical Stack

- **Backend**: Node.js, TypeScript, Fastify, PostgreSQL
- **Frontend**: React Native (Expo), Next.js
- **AI**: OpenAI GPT-4 with custom orchestrator
- **Security**: JWT, CORS, RLS, AES-GCM
- **Deployment**: Vercel (web), Expo (mobile)

## 📋 Development Process

1. **Milestone-by-milestone**: Never skip or merge milestones
2. **Explicit approval**: Ask for approval before proceeding
3. **Comprehensive deliverables**: Code, tests, docs, demos
4. **Production-ready**: Each milestone must be deployable
5. **Security-first**: All features must meet security requirements

## 🎯 Success Criteria

- **Functional**: Complete couple chat with AI assistance
- **Secure**: Production-ready security and privacy
- **Scalable**: Proper architecture for growth
- **Maintainable**: Clean code with comprehensive tests
- **Accessible**: WCAG AA compliance
- **Deployable**: Ready for production deployment

---

**Remember**: Always ask for explicit approval before starting the next milestone. Never skip or merge milestones.
