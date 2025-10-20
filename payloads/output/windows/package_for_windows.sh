#!/bin/bash
# Simple build script - just package for Windows deployment

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Loki C2 - Windows Deployment Package Creator          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "ℹ️  Note: PyInstaller cannot cross-compile from macOS to Windows."
echo "   This script packages files for building ON Windows."
echo ""

# Create deployment package
PACKAGE_NAME="loki_windows_deploy.zip"

echo "[*] Creating deployment package..."
echo ""

zip -q "$PACKAGE_NAME" \
    loki_injector.py \
    build.bat \
    README.md

if [ -f "$PACKAGE_NAME" ]; then
    echo "✅ Package created: $PACKAGE_NAME"
    ls -lh "$PACKAGE_NAME"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "📋 DEPLOYMENT OPTIONS"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "Option 1: Build on Windows Machine"
    echo "───────────────────────────────────────────────────────────────"
    echo "  1. Transfer $PACKAGE_NAME to Windows"
    echo "  2. Extract files"
    echo "  3. Run build.bat"
    echo "  4. Output: dist\\loki_injector.exe"
    echo ""
    echo "Option 2: Just Run Python Script (No Build Needed!)"
    echo "───────────────────────────────────────────────────────────────"
    echo "  1. Transfer loki_injector.py to Windows"
    echo "  2. Install Python: winget install Python.Python.3.11"
    echo "  3. Run: python loki_injector.py"
    echo "  4. Same functionality as .exe!"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo ""
else
    echo "❌ Failed to create package"
    exit 1
fi
