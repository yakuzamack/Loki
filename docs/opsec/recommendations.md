# Opsec Recommendations
- Obfuscate the javascript files with an obfuscator
- Blend LokiC2 javascript agent files with target Electron app
- Use Node tools to package everything into an ASAR archive
- Replace strings in `agent/packages.json` to match target Electron app
- Recompile the node DLLs or modify them to change their hash