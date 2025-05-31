#!/bin/bash

# Setup script for the SQLite database
echo "🗄️  Setting up SQLite database for Ursiform..."

# Create .env.local file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    echo "DATABASE_URL=\"file:./dev.db\"" > .env.local
    echo "✅ Created .env.local with DATABASE_URL"
else
    # Check if DATABASE_URL exists in .env.local
    if ! grep -q "DATABASE_URL" .env.local; then
        echo "📝 Adding DATABASE_URL to existing .env.local..."
        echo "DATABASE_URL=\"file:./dev.db\"" >> .env.local
        echo "✅ Added DATABASE_URL to .env.local"
    else
        echo "✅ DATABASE_URL already exists in .env.local"
    fi
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push database schema
echo "📊 Pushing database schema..."
npx prisma db push

echo "🎉 Database setup complete!"
echo ""
echo "You can now run the development server with:"
echo "npm run dev" 