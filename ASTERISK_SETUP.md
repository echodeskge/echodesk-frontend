# Quick Asterisk Server Setup Guide

## 🚀 Your Server Configuration

Based on your registration screenshot, here are your server details:

### **Connection Details:**
- **WebSocket URL**: `wss://165.227.166.42/ws`
- **SIP URI**: `sip:1001@165.227.166.42`
- **Password**: `Giorgi123.`
- **Realm**: `asterisk`

## 📋 How to Set Up in EchoDesk

### **Option 1: Quick Setup Button (Recommended)**

1. **Go to the Calls section** in your EchoDesk dashboard
2. **Click "SIP Configurations"** tab
3. **Click the green "🚀 Quick Setup (Asterisk)"** button
4. **Review the pre-filled configuration:**
   - Name: "EchoDesk Asterisk Server"
   - Server: 165.227.166.42
   - Port: 8089 (WebSocket port)
   - Username: 1001
   - Password: Giorgi123.
   - Realm: 165.227.166.42
5. **Click "Save Configuration"**
6. **Click "Set as Default"** if this is your primary server
7. **Click "Test Connection"** to verify it works

### **Option 2: Manual Setup**

If you prefer to configure manually:

1. **Click "➕ Add Configuration"**
2. **Fill in the details:**
   ```
   Name: My Asterisk Server
   SIP Server: 165.227.166.42
   SIP Port: 8089
   Username: 1001
   Password: Giorgi123.
   Realm: asterisk  # or 165.227.166.42
   STUN Server: stun:stun.l.google.com:19302
   ```
3. **Enable "Active"** and **"Default"**
4. **Save and test**

## 🔍 Testing Your Connection

After setup, you should see:

1. **Registration Status**: "✅ SIP Connected" (green)
2. **Test Connection**: Should return "✅ SIP configuration test successful"
3. **Browser Console**: Should show "✅ Successfully registered with SIP server"

## 📞 Making Test Calls

Once connected, you can test calling:

1. **In the CallManager interface**
2. **Enter a phone number** (the system will auto-format Georgian numbers)
3. **Click "Call"** button
4. **Allow microphone access** when prompted
5. **Check for audio** in both directions

### **Number Format Examples:**
```
Input: 555123456    → Output: +995555123456
Input: 22123456     → Output: +99522123456
Input: 1002         → Output: 1002 (internal extension)
```

## 🛠️ Troubleshooting

### **Issue: SIP Disconnected**
- Check if WebSocket port 8089 is open
- Verify credentials (username: 1001, password: Giorgi123.)
- Ensure HTTPS is used (WSS requires secure connection)

### **Issue: Registration Failed**
- Check the realm setting (try both "asterisk" and "165.227.166.42")
- Verify the server allows WebSocket connections
- Check firewall settings

### **Issue: Can't Make Calls**
- Ensure microphone permissions are granted
- Check if the target number/extension exists
- Verify the Asterisk dial plan allows outbound calls

### **Issue: No Audio**
- Check browser microphone/speaker permissions
- Verify STUN server connectivity
- Test with headphones to avoid echo

## 🔧 Advanced Configuration

Your Asterisk server appears to be well-configured for WebRTC:

- **WebSocket Transport**: ✅ Available on port 8089
- **STUN Server**: Configured (helps with NAT traversal)
- **Realm**: Set to "asterisk"
- **Extension 1001**: Properly registered

## 📈 Next Steps

Once calling works:

1. **Add more extensions** (1002, 1003, etc.)
2. **Configure call recording** (if needed)
3. **Set up call routing** rules
4. **Add external SIP trunks** for PSTN calling
5. **Implement call transfer** and conference features

## 🎯 Expected Results

After successful setup:
- **Registration**: Automatic with server
- **Incoming Calls**: Will show popup in browser
- **Outgoing Calls**: Click-to-call functionality
- **Audio Quality**: HD voice with echo cancellation
- **Reliability**: Auto-reconnection on network issues

Your Asterisk server is **WebRTC-ready** and should work perfectly with EchoDesk! 🎉
