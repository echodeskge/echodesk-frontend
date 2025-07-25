#!/bin/bash

# SIP Configuration Demo Script for EchoDesk
# This script helps you add a test SIP configuration to your amanati tenant

echo "🚀 EchoDesk SIP Configuration Setup"
echo "=================================="
echo ""

# Configuration
API_BASE="https://amanati.api.echodesk.ge"
FRONTEND_URL="https://amanati.echodesk.ge"

echo "📋 This script will help you:"
echo "  1. Add a SIP configuration to your tenant"
echo "  2. Test the SIP connection"
echo "  3. Enable calling functionality"
echo ""

# Get user token
echo "🔑 First, you need your authentication token from $FRONTEND_URL"
echo ""
echo "To get your token:"
echo "  1. Login to $FRONTEND_URL"
echo "  2. Open browser developer tools (F12)"
echo "  3. Go to Application/Storage → Local Storage"
echo "  4. Copy the 'authToken' value"
echo ""
read -p "Enter your auth token: " AUTH_TOKEN

if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ Token is required. Exiting."
    exit 1
fi

echo ""
echo "📞 SIP Provider Configuration"
echo "Choose your SIP provider or enter custom details:"
echo ""
echo "1) Test with SIP.js Demo Server (for testing only)"
echo "2) VoIP.ms"
echo "3) Twilio"
echo "4) Custom SIP Provider"
echo ""
read -p "Select option (1-4): " PROVIDER_CHOICE

case $PROVIDER_CHOICE in
    1)
        # Test configuration
        SIP_NAME="Test SIP Server"
        SIP_SERVER="sipjs.onsip.com"
        SIP_PORT="443"
        SIP_USERNAME="test_user"
        SIP_PASSWORD="test_pass"
        SIP_REALM="sipjs.onsip.com"
        echo "⚠️  Using test server - for demo only!"
        ;;
    2)
        # VoIP.ms
        SIP_NAME="VoIP.ms"
        SIP_SERVER="atlanta.voip.ms"
        SIP_PORT="5060"
        echo "Enter your VoIP.ms details:"
        read -p "Username (format: 123456_youruser): " SIP_USERNAME
        read -s -p "Password: " SIP_PASSWORD
        echo ""
        SIP_REALM="atlanta.voip.ms"
        ;;
    3)
        # Twilio
        SIP_NAME="Twilio SIP"
        echo "Enter your Twilio SIP details:"
        read -p "SIP Domain (your-account.sip.twilio.com): " SIP_SERVER
        read -p "Username: " SIP_USERNAME
        read -s -p "Password: " SIP_PASSWORD
        echo ""
        SIP_PORT="5060"
        SIP_REALM="$SIP_SERVER"
        ;;
    4)
        # Custom
        echo "Enter your SIP provider details:"
        read -p "Configuration name: " SIP_NAME
        read -p "SIP server (e.g., sip.provider.com): " SIP_SERVER
        read -p "SIP port (default 5060): " SIP_PORT
        read -p "Username: " SIP_USERNAME
        read -s -p "Password: " SIP_PASSWORD
        echo ""
        read -p "Realm (usually same as server): " SIP_REALM
        ;;
    *)
        echo "❌ Invalid option. Exiting."
        exit 1
        ;;
esac

# Set defaults
SIP_PORT=${SIP_PORT:-5060}
SIP_REALM=${SIP_REALM:-$SIP_SERVER}

echo ""
echo "🔧 Creating SIP configuration..."

# Create SIP configuration
RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST "$API_BASE/api/sip-configurations/" \
    -H "Authorization: Token $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"$SIP_NAME\",
        \"sip_server\": \"$SIP_SERVER\",
        \"sip_port\": $SIP_PORT,
        \"username\": \"$SIP_USERNAME\",
        \"password\": \"$SIP_PASSWORD\",
        \"realm\": \"$SIP_REALM\",
        \"stun_server\": \"stun:stun.l.google.com:19302\",
        \"is_default\": true,
        \"is_active\": true,
        \"max_concurrent_calls\": 5
    }")

# Extract HTTP status
HTTP_STATUS=$(echo $RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
BODY=$(echo $RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

if [ $HTTP_STATUS -eq 201 ]; then
    echo "✅ SIP configuration created successfully!"
    echo ""
    echo "📱 Your SIP configuration:"
    echo "  Name: $SIP_NAME"
    echo "  Server: $SIP_SERVER:$SIP_PORT"
    echo "  Username: $SIP_USERNAME"
    echo ""
    echo "🎯 Next steps:"
    echo "  1. Open $FRONTEND_URL"
    echo "  2. Go to the Call Manager"
    echo "  3. Look for 'SIP Connected' status"
    echo "  4. Click 'Test SIP' to verify connection"
    echo "  5. Start making calls!"
    echo ""
    echo "🔍 If you see 'SIP Disconnected':"
    echo "  - Check your SIP credentials"
    echo "  - Verify network connectivity"
    echo "  - Try the 'Test SIP' button for detailed errors"
    echo ""
    echo "📞 For testing calls:"
    echo "  - Use a valid phone number format (+1234567890)"
    echo "  - Ensure your SIP provider allows WebRTC calls"
    echo "  - Grant microphone permission in your browser"
    
elif [ $HTTP_STATUS -eq 401 ]; then
    echo "❌ Authentication failed. Please check your token."
    exit 1
elif [ $HTTP_STATUS -eq 400 ]; then
    echo "❌ Bad request. Response:"
    echo "$BODY"
    exit 1
else
    echo "❌ Failed to create SIP configuration (HTTP $HTTP_STATUS)"
    echo "Response: $BODY"
    exit 1
fi

echo ""
echo "🎉 SIP configuration complete! You can now make and receive calls through $FRONTEND_URL"
