#!/bin/bash

echo "🚀 Voice Social Clean Build"

# Backend dependencies
echo "📦 Backend install..."
npm install --legacy-peer-deps --no-audit --prefer-offline

# Frontend dependencies  
echo "📦 Frontend install..."
cd client
npm install --legacy-peer-deps --no-audit --prefer-offline

# Build
echo "🔨 Building..."
npm run build

echo "✅ Done!"
