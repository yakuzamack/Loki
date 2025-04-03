- Install Node JS
```bash
brew install node
```

- Install Electron Globally 
```bash
npm install -g electron
```

- Build the client and get the required node mondules from Node Package Manager 
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
  - The `Loki C2 Client.app` will be in `LokiC2/client/dist/`