# Opsec Recommendations
- Obfuscate the javascript files with an obfuscator
- Blend LokiC2 javascript agent files with target Electron app
- Use Node tools to package everything into an ASAR archive
- Replace strings in `agent/packages.json` to match target Electron app
- Recompile the node DLLs or modify them to change their hash
- The assembly execution out of the box node DLL will get you burned against MDE. It is ported code from Shawn Jones public version of Inline-ExecuteAssembly. Recently MDE rolled out a detection for patching the AMSI function, which results in a HIGH threat detection thrown.
- Make changes to the assembly execution C++ code to use a viable AMSI and ETW bypass method, or comment out the patches, and compile yourself.
- At runtime the Electron app will create a directory in ~/AppData/Roaming/ with whatever name you put in the agents pckages.json at the top. Probably want to use an app name that is not suspicious, and not "Loki C2".
