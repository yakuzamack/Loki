- Install Node JS
    - Go to [nodejs.org](https://nodejs.org) and download the latest version of Node.js for Windows.

- Install Electron Globally 
```bash
npm install -g electron
```

- Build the client and get the required node modules from Node Package Manager 
```bash
cd LokiC2/client/
npm install
```

- Start the GUI client in devmode (Optional)
```bash
cd LokiC2/client/
npx electron .
```

- Install the Electron Builder
```bash
cd LokiC2/client/
npm install --save-dev electron-builder
```

- Build the GUI client app
```bash
npm run dist
```
    - The `Loki C2 Client.exe` will be in `LokiC2/client/dist/`
