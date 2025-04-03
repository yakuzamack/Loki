const fs = require('fs');
const path = require('path');
const os = require('os');

const getAppDataDir = (appName = 'Loki') => {
    try {
        const homeDir = os.homedir();
        if (!homeDir) throw new Error('Could not determine home directory');

        // Define directories
        const appDataDir = path.join(homeDir, appName);
        const logDir = path.join(appDataDir, 'log');
        const downloadsDir = path.join(appDataDir, 'downloads');
        const configDir = path.join(appDataDir, 'config');
        const configFilePath = path.join(configDir, 'config.js');

        // Ensure directories exist
        [appDataDir, logDir, downloadsDir, configDir].forEach((dir) => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Default config content
        const configContent = `module.exports = {
    "storageAccount": "{REPLACE}.blob.core.windows.net",
    "metaContainer": "mfd42094a8e855ed2a70b435",
    "sasToken": "se=2025-05-11T1..."
};`;

        // Create config.js if it doesn't exist
        if (!fs.existsSync(configFilePath)) {
            fs.writeFileSync(configFilePath, configContent, { encoding: 'utf8' });
        }

        return { appDataDir, logDir, downloadsDir, configDir, configFilePath };
    } catch (error) {
        console.error(`Error creating app data directories or config file: ${error.message}`);
        return null;
    }
};

module.exports = { getAppDataDir };
