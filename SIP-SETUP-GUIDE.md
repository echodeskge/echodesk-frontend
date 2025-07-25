# SIP Configuration Guide for EchoDesk

## Complete SIP Integration Implementation

The CallManager now includes **real SIP calling functionality** using SIP.js! Here's what you need to know:

## ✅ What's Now Working:

### 1. **Real SIP Protocol Implementation**
- Full SIP.js integration for actual calls
- WebRTC peer-to-peer audio connections
- SIP registration with your provider
- Proper call signaling (INVITE, ACK, BYE, etc.)

### 2. **Call Features**
- **Outgoing calls**: Click-to-call from dashboard
- **Incoming calls**: Auto-detection and answer/reject interface  
- **Call management**: Answer, reject, hold, end calls
- **Audio handling**: Real-time audio streaming
- **Call history**: Integration with backend logging

### 3. **SIP Provider Integration**
- Automatic registration with your SIP server
- Support for STUN/TURN servers
- Authentication with username/password
- Real-time connection status monitoring

## 🔧 Setting Up SIP Configuration

### Step 1: Access SIP Configuration in Dashboard

1. **Login to your tenant dashboard**: `https://amanati.echodesk.ge`
2. **Navigate to Settings** (when implemented) or use the API directly
3. **SIP Configuration section** will show current setups

### Step 2: Configure Your SIP Provider

Use the SIP configuration API endpoint to add your provider details:

```bash
# Example SIP configuration for a provider like Twilio, VoIP.ms, etc.
curl -X POST https://amanati.api.echodesk.ge/api/sip-configurations/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main SIP Line",
    "sip_server": "sip.your-provider.com",
    "sip_port": 5060,
    "username": "your_sip_username", 
    "password": "your_sip_password",
    "realm": "sip.your-provider.com",
    "stun_server": "stun:stun.l.google.com:19302",
    "is_default": true,
    "is_active": true,
    "max_concurrent_calls": 5
  }'
```

### Step 3: Common SIP Provider Examples

#### **Twilio**
```json
{
  "name": "Twilio SIP",
  "sip_server": "your-account.sip.twilio.com",
  "sip_port": 5060,
  "username": "your_twilio_username",
  "password": "your_twilio_password", 
  "realm": "your-account.sip.twilio.com"
}
```

#### **VoIP.ms**
```json
{
  "name": "VoIP.ms",
  "sip_server": "atlanta.voip.ms",
  "sip_port": 5060,
  "username": "123456_youruser",
  "password": "your_password",
  "realm": "atlanta.voip.ms"
}
```

#### **Generic SIP Provider**
```json
{
  "name": "My SIP Provider",
  "sip_server": "sip.provider.com",
  "sip_port": 5060,
  "username": "your_extension",
  "password": "your_password",
  "realm": "sip.provider.com"
}
```

## 🚀 Using the Call Manager

### Dashboard Features:

1. **SIP Status Indicator**: Shows if connected to SIP server
2. **Test SIP Button**: Verify your configuration works
3. **Dial Pad**: Enter numbers and make calls
4. **Incoming Call UI**: Answer/reject incoming calls
5. **Active Call Controls**: Mute, hold, end call
6. **Call History**: See recent calls with callback options

### Making Calls:

1. **Enter phone number** in the dial pad (include country code if needed)
2. **Click "Call"** button
3. **Call connects via your SIP provider**
4. **Audio streams through your browser** (requires microphone permission)

### Receiving Calls:

1. **Incoming calls auto-detect** when someone calls your SIP number
2. **Answer/Decline interface** appears automatically  
3. **Click "Answer"** to accept the call
4. **Audio starts streaming** immediately

## 🔧 Troubleshooting

### Common Issues:

#### **"SIP Disconnected" Status**
- Check your SIP server URL and port
- Verify username/password are correct
- Ensure firewall allows SIP traffic (UDP 5060)
- Try the "Test SIP" button for detailed error info

#### **"No Audio During Calls"**
- Browser needs microphone permission
- Check if STUN/TURN servers are accessible
- Verify your network allows WebRTC traffic
- Try different STUN server: `stun:stun.l.google.com:19302`

#### **"Calls Not Connecting"**
- Verify your SIP provider allows WebRTC calls
- Check if phone number format is correct (+1234567890)
- Ensure your SIP account has calling credits/permissions

### Browser Requirements:

- **Chrome/Edge**: Full support ✅
- **Firefox**: Full support ✅  
- **Safari**: Partial support (may need configuration)
- **HTTPS required**: SIP.js needs secure context

## 📱 Next Steps

### For Full Production Setup:

1. **Get a SIP provider account** (Twilio, VoIP.ms, etc.)
2. **Configure your SIP details** in the dashboard
3. **Test the connection** using the "Test SIP" button
4. **Start making/receiving calls** through the browser
5. **Monitor call logs** in the dashboard

### Advanced Features Coming Soon:

- **Call recording**: Save call audio files
- **Call routing**: Route calls to different agents  
- **IVR integration**: Interactive voice response menus
- **Conference calls**: Multi-party calling
- **Mobile app**: Native iOS/Android apps

## 🎯 Quick Test Setup

Want to test immediately? You can use a SIP test account:

1. **Sign up for a free VoIP.ms trial** or **Twilio account**
2. **Get your SIP credentials** from the provider
3. **Add them via the API** or dashboard
4. **Click "Test SIP"** to verify connection
5. **Make a test call** to verify everything works!

---

**Your EchoDesk system now has full enterprise-grade calling capabilities! 🚀**
