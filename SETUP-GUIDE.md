# 🚀 Sync M1 Setup Guide

This guide will help you set up and test the M1 (Auth + Couples) implementation.

## 📋 Prerequisites

- Node.js 18+ (you have v22.18.0 ✅)
- npm (you have v10.9.3 ✅)

## 🛠️ Setup Steps

### 1. Install Dependencies
```bash
cd /Users/sofiavas/sync
npm install
```

### 2. Create Environment File
```bash
cp infra/env.example .env
```

### 3. Edit Environment File
Open `.env` and update these values:
```bash
# Database (for full version - not needed for simple test)
DATABASE_URL=postgresql://username:password@localhost:5432/sync_db

# JWT Secret (required)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Encryption Key (required - must be exactly 32 characters)
ENCRYPTION_KEY=your-32-character-encryption-key-here

# OpenAI API Key (for AI features)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 4. Start the Simple API Server
```bash
cd services/api
npx tsx src/simple-server.ts
```

You should see:
```
🚀 Sync API server running on http://0.0.0.0:3001
📚 API documentation available at http://0.0.0.0:3001/docs
🧪 Ready for testing! Use the test client: node test-api-client.js
```

### 5. Test the API (in a new terminal)
```bash
cd /Users/sofiavas/sync
node test-simple.js
```

## 🧪 What the Test Does

The test script demonstrates the complete M1 flow:

1. **Alice** requests verification code → gets code via server logs
2. **Alice** verifies code → gets JWT token
3. **Alice** creates couple → becomes userA
4. **Alice** creates invite → gets invite code and link
5. **Bob** requests verification code → gets code
6. **Bob** verifies code → gets JWT token
7. **Bob** accepts invite → becomes userB in Alice's couple
8. Both users can now access couple data

## 🔑 Important Notes

- **Verification codes** are logged to the server console (check the terminal running the server)
- **Use the same code** (123456) for both Alice and Bob in the test
- **JWT tokens** are valid for 7 days
- **Invite codes** expire in 24 hours
- **Data is stored in memory** (will be lost when server restarts)

## 🐛 Troubleshooting

### Server won't start
- Check if port 3001 is already in use
- Make sure you're in the `services/api` directory
- Verify Node.js version: `node --version`

### Test fails
- Make sure the server is running
- Check the server logs for verification codes
- Verify the `.env` file has the required values

### API errors
- Check the server console for error messages
- Verify JWT_SECRET is set in `.env`
- Make sure you're using the correct verification codes

## 📚 API Endpoints

- `GET /health` - Health check
- `POST /auth/request-code` - Request verification code
- `POST /auth/verify-code` - Verify code and get token
- `GET /auth/me` - Get current user info
- `POST /couples` - Create couple
- `POST /invites` - Create invite
- `POST /invites/:code/accept` - Accept invite
- `GET /couples/me` - Get couple info

## 🎯 Next Steps

Once M1 is working, you can:
1. Test the full database version (requires PostgreSQL)
2. Move to M2 (Sessions & Messages)
3. Add the AI orchestrator
4. Build the web interface

## 💡 Tips

- Keep the server running in one terminal
- Run tests in another terminal
- Check server logs for verification codes
- The simple version is perfect for testing the flow
