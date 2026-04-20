#!/bin/bash

echo "🚀 LeetTrack - Quick Setup Script"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo ""

# Check if MongoDB is running
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB not found. You'll need MongoDB installed and running."
    echo "Visit: https://www.mongodb.com/try/download/community"
    echo ""
fi

# Backend setup
echo "📦 Setting up backend..."
cd server
npm install
echo "✓ Backend dependencies installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  IMPORTANT: Edit server/.env with your MongoDB URI and email credentials!"
    echo ""
fi

cd ..

# Frontend setup
echo "📦 Setting up frontend..."
cd client
npm install
echo "✓ Frontend dependencies installed"
echo ""

cd ..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit server/.env with your configuration"
echo "2. Make sure MongoDB is running"
echo "3. In one terminal: cd server && npm run dev"
echo "4. In another terminal: cd client && npm run dev"
echo "5. Open http://localhost:3000 in your browser"
echo ""
echo "For detailed instructions, see README.md"
