# Detections
- [LOLBAS Teams](https://lolbas-project.github.io/lolbas/OtherMSBinaries/Teams/)  
- [MITRE ATT&CK 
T1218.015: Electron Applications](https://attack.mitre.org/techniques/T1218/015/)
- IOC: %LOCALAPPDATA%\Microsoft\Teams\current\app directory created
- IOC: %LOCALAPPDATA%\Microsoft\Teams\current\app.asar file created/modified by non-Teams installer/updater
- Execution of an electron app from a abnormal directory such as `~/Downloads/Teams/Teams.exe`
- Electron apps beaconing to an Azure Storage Blob `*.blob.core.windows.net`
- SAS token usage in network traffic
- Electron apps spawning child processes such as `netstat.exe` or `whoami.exe` 

# Acknowledgements:
- Andrew Kisliakov
- [mr.d0x (@mrd0x)](https://twitter.com/@mrd0x)
