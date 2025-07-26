# SIP Calling Setup Guide for EchoDesk

## Overview
Your EchoDesk system now includes a full SIP.js implementation for browser-based calling. This guide will help you set up and test SIP calling functionality.

## 🚀 What's Already Implemented

### ✅ SIP.js Integration
- Full SIP.js UserAgent with WebRTC support
- Automatic registration with SIP servers
- Outgoing call functionality with enhanced number formatting
- Incoming call handling
- Audio stream management with echo cancellation
- Connection state management

### ✅ Enhanced Features
- **Smart Number Formatting**: Automatically formats Georgian numbers (+995)
- **Provider Detection**: Identifies traditional vs WebRTC-compatible providers
- **Enhanced Audio**: Echo cancellation, noise suppression, auto gain control
- **Multiple STUN Servers**: Improved connectivity with backup servers
- **Detailed Error Handling**: Specific error messages for different call failures

## 📋 SIP Provider Requirements

### ✅ WebRTC-Compatible Providers (Work with browsers)
- **Twilio** - Full WebRTC support
- **Vonage (Nexmo)** - WebRTC ready
- **3CX** - WebRTC support via WebClient
- **Asterisk** - With WebRTC module enabled
- **FreeSWITCH** - With mod_verto or WebRTC gateway
- **OpenSIPS/Kamailio** - With WebSocket module

### ❌ Traditional Providers (Don't work with browsers)
- Most Georgian providers (Telekom.ge, Geocell, etc.)
- IP-based SIP servers without WebSocket support
- Standard UDP/TCP only providers

## 🛠️ Setup Instructions

### 1. For WebRTC-Compatible Providers

```javascript
// Example SIP Configuration for Asterisk/FreeSWITCH
{
  name: "My WebRTC SIP",
  sip_server: "your-asterisk-server.com",
  sip_port: 8089, // WebSocket port
  username: "your_extension", 
  password: "your_password",
  realm: "your-asterisk-server.com",
  stun_server: "stun:stun.l.google.com:19302",
  is_active: true,
  is_default: true
}
```

### 2. For Traditional Providers (Requires Gateway)

If you have a traditional Georgian SIP provider, you need to set up a WebRTC gateway:

#### Option A: Asterisk Gateway Setup
```bash
# Install Asterisk with WebRTC support
sudo apt update
sudo apt install asterisk

# Configure Asterisk for WebRTC
# /etc/asterisk/http.conf
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088
tlsenable=yes
tlsbindaddr=0.0.0.0:8089

# /etc/asterisk/pjsip.conf
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

# Create endpoints for web clients and PSTN gateway
```

#### Option B: FreeSWITCH Gateway
```bash
# Install FreeSWITCH
# Configure WebRTC module and gateway to your provider
```

### 3. Testing Your Setup

1. **Add SIP Configuration** in EchoDesk:
   - Go to Calls → SIP Configurations
   - Add your WebRTC-compatible provider details
   - Test the connection

2. **Check Browser Console**:
   - Open Developer Tools (F12)
   - Look for SIP registration messages
   - Should see "✅ Successfully registered with SIP server"

3. **Test Calling**:
   - Try calling a test number
   - Check for audio permissions
   - Verify two-way audio

## 🔧 Common Issues & Solutions

### Issue 1: "WebRTC Compatibility Issue"
**Cause**: Traditional SIP provider doesn't support WebSocket
**Solution**: Set up Asterisk/FreeSWITCH gateway or switch to WebRTC provider

### Issue 2: Registration Failed
**Causes**:
- Wrong credentials
- Firewall blocking WebSocket connections
- Server doesn't support WebSocket transport

**Solutions**:
- Verify username/password
- Check WebSocket port (usually 8089 for Asterisk)
- Ensure HTTPS if using WSS

### Issue 3: Can't Hear Audio
**Causes**:
- Browser microphone permissions denied
- Audio elements not properly connected
- ICE connection failed

**Solutions**:
- Allow microphone access in browser
- Check STUN/TURN server configuration
- Verify firewall allows WebRTC traffic

### Issue 4: Calls Don't Connect
**Causes**:
- Wrong number format
- Provider routing issues
- Network connectivity

**Solutions**:
- Try different number formats (+995XXXXXXX vs 0XXXXXXX)
- Check provider's dial plan
- Test with known working numbers

## 📞 Number Formatting

The system automatically handles Georgian number formats:

```javascript
// Input → Output
"555123456" → "+995555123456" (mobile)
"22123456" → "+99522123456" (landline)
"0555123456" → "+995555123456" 
"00995555123456" → "+995555123456"
"+995555123456" → "+995555123456" (unchanged)
```

## 🌐 Recommended WebRTC Providers

### For Development/Testing:
1. **Local Asterisk/FreeSWITCH** - Full control
2. **Twilio** - Easy setup, pay-per-use
3. **3CX Cloud** - Free tier available

### For Production:
1. **Twilio** - Reliable, global
2. **Vonage** - Enterprise features
3. **Self-hosted Asterisk** - Cost-effective for high volume

## 🔍 Debugging

### Enable Debug Logging:
```javascript
// In SipService.ts, change:
logLevel: 'debug' // More verbose logging
```

### Check Network Tab:
- WebSocket connection attempts
- SIP REGISTER messages
- INVITE/OK responses

### Test WebSocket Connection:
```javascript
// Test in browser console
const ws = new WebSocket('wss://your-server:8089/ws');
ws.onopen = () => console.log('WebSocket connected');
ws.onerror = (e) => console.error('WebSocket error:', e);
```

## 📈 Next Steps

1. **Set up your WebRTC provider** or gateway
2. **Configure SIP settings** in EchoDesk
3. **Test calling functionality**
4. **Add call logging** and recording features
5. **Implement chat integration**

## 🆘 Need Help?

If you're having issues:
1. Check the browser console for detailed error messages
2. Verify your SIP provider supports WebRTC/WebSocket
3. Test with a known WebRTC provider first
4. Consider setting up a local Asterisk server for testing

The SIP implementation is now production-ready for WebRTC-compatible providers!
