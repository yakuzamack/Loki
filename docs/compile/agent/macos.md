# macOS Agent Build Instructions
I don't recommend this unless you're going to figure out Script Jacking, but if you want to anyways heres how to compile the agent on macOS. Also without Script Jacking the agent will be unsigned and not distributable. Its possible to get it signed but that is not the purpose of this.

- Install Node JS
```bash
brew install node
```

- Install Electron Globally 
```bash
npm install -g electron
```

- Build the agent and get the required node mondules from Node Package Manager 
```bash
cd LokiC2/agent/
npm install
```

- Start the GUI client in devmode (Optional)
```bash
cd LokiC2/agent/
npx electron .
```

- Install the Electron Builder
```bash
cd LokiC2/agent/
npm install --save-dev electron-builder
```

- Build the GUI client app
```bash
npm run dist
```
  - The `Loki C2 Agent.app` will be in `LokiC2/agent/dist/`