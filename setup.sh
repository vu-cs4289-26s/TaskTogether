#!/bin/bash
set -e

echo "Setup"
echo "========================================"

# Check prerequisites
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "Node.js not found. Install from nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm not found."; exit 1; }

echo "✓ Node.js and npm found"

# Setup Backend
echo ""
echo "Setting up backend..."
cd server
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✓ Created .env from template - EDIT IT if using local postgres!"
fi

echo "✓ Installing dependencies..."
npm install

echo "✓ Backend setup complete"

# Setup Frontend
echo ""
echo "Setting up frontend..."
cd ../client
echo "✓ Installing dependencies..."
npm install

echo "✓ Frontend setup complete"

echo ""
echo "Bootstrap complete!"
echo ""
echo "Next steps:"
echo "1. Start PostgreSQL:"
echo "   docker-compose up -d"
echo ""
echo "2. Setup database:"
echo "   cd server && npx prisma migrate dev --name init"
echo ""
echo "3. In separate terminals:"
echo "   Terminal 1: cd server && npm run dev"
echo "   Terminal 2: cd client && npm run dev"
echo ""
echo "4. Open http://localhost:3000"
