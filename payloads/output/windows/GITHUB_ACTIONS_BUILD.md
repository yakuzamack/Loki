# Windows EXE Build - GitHub Actions CI/CD

## ✅ Automated Cloud Build (Recommended!)

**No Windows machine needed!** GitHub Actions builds your .exe in the cloud for free.

### 🚀 Quick Start

#### Option 1: Manual Trigger (Easiest)

1. **Push the workflow to GitHub:**
   ```bash
   cd /Users/home/projects/Loki
   git add .github/workflows/build-windows-exe.yml
   git add payloads/output/windows/loki_injector.py
   git commit -m "Add GitHub Actions Windows build pipeline"
   git push origin main
   ```

2. **Trigger the build:**
   - Go to your GitHub repo
   - Click **"Actions"** tab
   - Select **"Build Windows EXE"** workflow
   - Click **"Run workflow"** button
   - Choose **"loki_injector"**
   - Click **"Run workflow"**

3. **Wait 2-3 minutes** for the build to complete

4. **Download your .exe:**
   - Build will show ✅ green checkmark
   - Scroll down to **"Artifacts"** section
   - Click **"loki-injector-windows-exe"**
   - Downloads `loki_injector.exe` (ready to deploy!)

#### Option 2: Automatic Build on Push

Every time you update `loki_injector.py` and push to GitHub, the .exe automatically rebuilds!

```bash
# Make changes to payload
vim payloads/output/windows/loki_injector.py

# Push changes
git add payloads/output/windows/loki_injector.py
git commit -m "Update payload"
git push

# Build automatically triggers!
# Check Actions tab for progress
```

#### Option 3: Create Release with Tagged Build

```bash
# Tag your release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# GitHub Actions:
# 1. Builds the .exe
# 2. Creates GitHub Release
# 3. Attaches loki_injector.exe to release

# Download from Releases page!
```

---

## 📋 What the Pipeline Does

```yaml
1. Spins up Windows Server (latest)
2. Installs Python 3.11
3. Installs PyInstaller
4. Builds loki_injector.exe
5. Uploads as downloadable artifact
6. (Optional) Creates GitHub Release
```

**Build time:** ~2-3 minutes
**Cost:** 100% FREE (GitHub Free tier includes 2,000 minutes/month)

---

## 🎯 CI/CD Advantages

### ✅ Benefits

| Feature | Manual Build | GitHub Actions |
|---------|-------------|----------------|
| **Windows machine needed** | ❌ Yes | ✅ No |
| **Setup time** | 30+ min | 5 min |
| **Automated** | ❌ Manual | ✅ Automatic |
| **Reproducible builds** | ❌ Varies | ✅ Always same |
| **Version control** | ❌ Manual | ✅ Built-in |
| **Cost** | VM costs | ✅ Free |

### ✅ Features

- **Automatic builds** on code changes
- **Downloadable artifacts** (30-day retention)
- **GitHub Releases** integration
- **Build history** and logs
- **Multiple Python versions** (if needed)
- **Build matrix** (x86, x64, ARM64)
- **Secrets management** (for C2 config)

---

## 🔧 Advanced Configuration

### Add Build Matrix (Multiple Architectures)

Edit `.github/workflows/build-windows-exe.yml`:

```yaml
jobs:
  build-windows-exe:
    runs-on: windows-latest
    strategy:
      matrix:
        arch: [x64, x86]
    
    steps:
      - name: Build for ${{ matrix.arch }}
        run: |
          pyinstaller --onefile --target-arch=${{ matrix.arch }} loki_injector.py
```

### Add C2 Server Configuration via Secrets

1. **Add secret in GitHub:**
   - Repo → Settings → Secrets → Actions
   - New repository secret:
     - Name: `C2_SERVER_URL`
     - Value: `https://your-c2-server.com`

2. **Update workflow:**

```yaml
- name: Configure C2 Server
  run: |
    cd payloads/output/windows
    sed -i 's|REPLACE_WITH_YOUR_C2_SERVER|${{ secrets.C2_SERVER_URL }}|g' loki_injector.py
  shell: bash
```

### Add Code Signing

```yaml
- name: Sign executable
  run: |
    signtool sign /f certificate.pfx /p ${{ secrets.CERT_PASSWORD }} /tr http://timestamp.digicert.com dist/loki_injector.exe
```

### Add Obfuscation

```yaml
- name: Obfuscate payload
  run: |
    pip install pyarmor
    pyarmor pack loki_injector.py
```

---

## 📊 Build Status Badge

Add to your README.md:

```markdown
![Build Status](https://github.com/boku7/Loki/actions/workflows/build-windows-exe.yml/badge.svg)
```

Shows build status: ✅ Passing or ❌ Failing

---

## 🛠️ Troubleshooting

### Build Fails

**Check logs:**
1. Go to Actions tab
2. Click failed build
3. Expand failed step
4. Read error message

**Common issues:**

| Error | Solution |
|-------|----------|
| `ModuleNotFoundError` | Add `pip install <module>` to workflow |
| `File not found` | Check paths in workflow |
| `Permission denied` | Use `sudo` or check file permissions |

### Artifact Download Issues

- Artifacts expire after 30 days (configurable)
- Must be logged into GitHub to download
- Large files (>2GB) may timeout

### Workflow Not Triggering

```bash
# Check workflow file is valid
yamllint .github/workflows/build-windows-exe.yml

# Verify it's on main branch
git branch --contains .github/workflows/build-windows-exe.yml

# Check GitHub Actions is enabled
# Repo → Settings → Actions → Allow actions
```

---

## 🎓 Usage Examples

### Example 1: Quick Build

```bash
# One-liner to build
git add -A && git commit -m "Build exe" && git push

# Then: Actions tab → Download artifact
```

### Example 2: Scheduled Builds

Add to workflow:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Build daily at 2 AM UTC
```

### Example 3: Multiple Payloads

```yaml
strategy:
  matrix:
    payload: [loki_injector, other_payload]

steps:
  - name: Build ${{ matrix.payload }}
    run: pyinstaller --onefile ${{ matrix.payload }}.py
```

---

## 📈 Comparison: Build Methods

| Method | Setup | Build Time | Reliability | Cost |
|--------|-------|------------|-------------|------|
| **GitHub Actions** | 5 min | 2-3 min | ⭐⭐⭐⭐⭐ | Free |
| Windows VM (UTM) | 30 min | 1-2 min | ⭐⭐⭐⭐ | Free |
| Wine (macOS) | 1 hour | Fails | ⭐ | Free |
| Azure Pipelines | 10 min | 2-3 min | ⭐⭐⭐⭐⭐ | Free tier |
| AWS CodeBuild | 15 min | 2-3 min | ⭐⭐⭐⭐ | Costs $ |

**Winner:** GitHub Actions ✅

---

## 🚀 Get Started Now

```bash
# 1. Commit the workflow
cd /Users/home/projects/Loki
git add .github/workflows/build-windows-exe.yml
git commit -m "Add Windows build CI/CD"
git push

# 2. Go to GitHub Actions tab
# 3. Run workflow
# 4. Download loki_injector.exe
# 5. Deploy!
```

**Time to first .exe: < 5 minutes!** 🎯

---

## 🔐 Security Considerations

### Secrets Management

Store sensitive data in GitHub Secrets:
- C2 server URLs
- API keys
- Encryption keys
- Code signing certificates

### Private Repositories

For OpSec:
- Use private repo (free with GitHub)
- Enable branch protection
- Require PR reviews
- Use deployment environments

### Artifact Security

- Artifacts are accessible to anyone with repo access
- Use encrypted artifacts for sensitive payloads
- Set short retention periods (7 days vs 30)

---

## 📞 Support

**Need help?**

1. Check workflow logs in Actions tab
2. Review GitHub Actions documentation
3. Test locally with `act` (GitHub Actions local runner)

---

## ✨ Summary

**What you get:**
- ✅ Automated Windows .exe builds
- ✅ No Windows machine needed
- ✅ 100% free (2,000 min/month)
- ✅ Downloadable artifacts
- ✅ GitHub Releases integration
- ✅ Version control
- ✅ Build history

**Ready to build?** Push the workflow and run it in GitHub Actions! 🚀
