#!/bin/bash

echo "🚀 Setting up Sync M1 - Auth + Couples"
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed. Please install PostgreSQL first."
    echo "   On macOS: brew install postgresql"
    echo "   On Ubuntu: sudo apt-get install postgresql"
    exit 1
fi

echo "✅ PostgreSQL is installed"

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp infra/env.example .env
    echo "✅ .env file created"
    echo "⚠️  Please edit .env file and add your configuration:"
    echo "   - DATABASE_URL: PostgreSQL connection string"
    echo "   - JWT_SECRET: Random secret key"
    echo "   - ENCRYPTION_KEY: 32-character encryption key"
    echo "   - OPENAI_API_KEY: Your OpenAI API key"
else
    echo "✅ .env file already exists"
fi

# Build packages
echo "🔨 Building packages..."
npm run build

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Set up PostgreSQL database:"
echo "   createdb sync_db"
echo "3. Run database migrations:"
echo "   npm run db:migrate"
echo "4. Start the API server:"
echo "   cd services/api && npm run dev"
echo "5. Test the API:"
echo "   node test-api-client.js"
echo ""
echo "📚 API documentation will be available at:"
echo "   http://localhost:3001/docs"
echo ""
echo "🔑 Don't forget to add your OpenAI API key to the .env file!"
