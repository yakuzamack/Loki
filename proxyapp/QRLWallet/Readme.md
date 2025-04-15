## Backdooring QRLWallet and Keeping the application working as normal

**Important Note: This requires QRLWallet, to be ran as administrator, due to the permissions requirement of the default installation directory: Program Files (x86)**

For doing this you will need to:
- Download the QRLWallet app
- Paste all Loki files except `package.json` to `QRL\app-1.8.1\resources\app`
  - Don't replace the real `package.json`
- Copy `/loki/proxyapp/QRLWallet/init.js` to `QRL\app-1.8.1\resources\app`
- Modify contents of `QRL\app-1.8.1\resources\app\package.json` to:
  - set `"main":"init.js",`

### How this works
- With these changes `qrlwallet.exe` will load in `init.js` on click / execution
- `init.js` reads in `package.json`
- `init.js` changes `"main":"init.js",` -> `"main":"main.js",`
  - `main.js` is Loki
- `init.js` spawns and disowns a new `qrlwallet.exe` which points to Loki
- __Loki is spawned in the background__
- `init.js` reads in `package.json` again
- `init.js` changes `"main":"main.js",` -> `"main":"index.js",`
  - `index.js"` is the real QRLWallet application
- `init.js` spawns and disowns a new `qrlwallet.exe` which points to the real QRLWallet
- __Real QRLWallet app is spawned, visible and operates as normal__
- When QRLWallet is exited by the user:
  - `init.js` catches the exit
  - `init.js` reads in `package.json` for a third time
  - `init.js` changes `"main":"index.js",` -> `"main":"init.js",`