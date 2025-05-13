# 🐧 Loki C2 GUI Client — Linux Build Instructions

> ✅ **Tested on Kali Linux 2025**  
> Build your Loki C2 client into an AppImage for streamlined deployment.

## 📦 Prerequisites

- Install npm and node.js using your distribution's package manager:

```bash

apt install npm

apt install nodejs -y

```

- Now install the Electron package globally:

```bash

npm install -g electron

```

### 🛠️ Building the Loki Client

- Navigate to the Loki C2 client directory and install dependencies:

```bash

cd Loki/client/

npm install

```

- Install the Electron builder package:

```bash

npm install --save-dev electron-builder

```

- You can use the package.json from the /agent/ folder as a base, but change "main": "main.js" to "main": "kernel.js" to reflect the correct entry point for the client. Here’s a complete, tested example:

```json

{
  "name": "loki",
  "version": "1.0.0",
  "main": "./kernel.js",
  "scripts": {
    "start": "electron .",
    "test": "echo \"Error: no test specified\" && exit 1",
    "pack": "electron-builder --dir",
    "dist": "electron-builder"
  },
  "keywords": [],
  "author": "boku7",
  "homepage": "",
  "license": "MIT",
  "description": "Lokey",
  "devDependencies": {
    "electron": "35.1.3",
    "electron-builder": "^26.0.12"
  },
  "dependencies": {
    "@azure/storage-blob": "^12.23.0",
    "https-proxy-agent": "^7.0.4"
  },
  "build": {
    "appId": "com.boku7.loki",
    "productName": "LokiClient",
    "copyright": "Copyright © 2025",
    "asar": true,
    "files": [
      "kernel.js",
      "*.html",
      "*.js",
      "*.css",
      "assets/**",
      "node_modules/@azure/**",
      "node_modules/https-proxy-agent/**",
      "node_modules/**/package.json"
    ],
    "linux": {
      "icon": "assets/linux/icon.png",
      "target": [
        "AppImage"
      ],
      "category": "Security"
    }
  }
}

```

- 🚀 Build the AppImage

```bash

npm run dist

```

- The Loki GUI Client AppImage will be located in the 'Loki/client/dist/' directory. 

#### ⚙️ Final Step: Configure Your Azure Storage:

- After launching the Loki GUI Client, enter your Azure Storage Account, SAS Token, and Meta Container information. Ensure the 'Meta Container' information matches the value you receive after running the 'create_agent_payload.js' on the agent files.