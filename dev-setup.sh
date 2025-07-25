#!/bin/bash

# EchoDesk Frontend Development Setup Script
# This script helps set up local development with subdomain support

echo "🚀 Setting up EchoDesk Frontend for development..."

# Check if running on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📍 Detected macOS - Setting up local subdomain support"
    
    # Add local development domains to /etc/hosts if not already present
    HOSTS_FILE="/etc/hosts"
    
    echo "🔧 Adding development domains to /etc/hosts..."
    
    # Check and add domains
    if ! grep -q "127.0.0.1 demo.localhost" "$HOSTS_FILE"; then
        echo "127.0.0.1 demo.localhost" | sudo tee -a "$HOSTS_FILE"
        echo "✅ Added demo.localhost"
    fi
    
    if ! grep -q "127.0.0.1 acme.localhost" "$HOSTS_FILE"; then
        echo "127.0.0.1 acme.localhost" | sudo tee -a "$HOSTS_FILE"
        echo "✅ Added acme.localhost"
    fi
    
    if ! grep -q "127.0.0.1 test.localhost" "$HOSTS_FILE"; then
        echo "127.0.0.1 test.localhost" | sudo tee -a "$HOSTS_FILE"
        echo "✅ Added test.localhost"
    fi
    
    echo "📝 Local domains configured:"
    echo "   - http://localhost:3000 (main domain)"
    echo "   - http://demo.localhost:3000 (demo tenant)"
    echo "   - http://acme.localhost:3000 (acme tenant)"
    echo "   - http://test.localhost:3000 (test tenant)"
    echo ""
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if Django backend is running
echo "🔍 Checking Django backend connection..."
if curl -s http://localhost:8000/api/tenants/list/ > /dev/null; then
    echo "✅ Django backend is running on http://localhost:8000"
else
    echo "⚠️  Django backend not detected on http://localhost:8000"
    echo "   Make sure to start your Django development server:"
    echo "   cd ../echodesk-back && python manage.py runserver"
fi

echo ""
echo "🎯 Development Environment Ready!"
echo ""
echo "🚀 Start the development server:"
echo "   npm run dev"
echo ""
echo "🌐 Test URLs:"
echo "   - Main: http://localhost:3000"
echo "   - Demo Tenant: http://demo.localhost:3000"
echo "   - Acme Tenant: http://acme.localhost:3000"
echo ""
echo "📋 Don't forget to:"
echo "   1. Start Django backend: python manage.py runserver"
echo "   2. Ensure PostgreSQL is running"
echo "   3. Create test tenants in Django admin"
echo ""
