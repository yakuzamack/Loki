const { log } = require('console');
const { spawn } = require('child_process');
const path = require('path');
const fsp = require('fs').promises;
const dns = require('dns');
const net = require('net'); // Import the net module

async function func_Scan_Ports(host, ports) {
  const openPorts = [];

  const checkPort = (host, port) => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(100); // Timeout after 2 seconds

      socket.on('connect', () => {
        openPorts.push(port);
        socket.destroy();
        resolve();
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve();
      });

      socket.on('error', () => {
        socket.destroy();
        resolve();
      });

      socket.connect(port, host);
    });
  };

  const portChecks = ports.map(port => checkPort(host, port));
  await Promise.all(portChecks);

  return openPorts;
}

function func_Split_Quoted_String(str) {
  const result = [];
  let current = '';
  let insideQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (insideQuotes) {
      if (char === '\\' && (str[i + 1] === quoteChar || str[i + 1] === '\\')) {
        // Handle escaped quote or backslash
        current += str[i + 1];
        i++; // Skip the next character
      } else if (char === quoteChar) {
        // End of quoted string
        insideQuotes = false;
        result.push(current);
        current = '';
      } else {
        // Inside quoted string
        current += char;
      }
    } else {
      if (char === '"' || char === "'") {
        // Start of quoted string
        insideQuotes = true;
        quoteChar = char;
      } else if (char === '\\' && str[i + 1] === ' ') {
        // Handle escaped space
        current += ' ';
        i++; // Skip the next character
      } else if (char === ' ') {
        // Space outside of quotes
        if (current.length > 0) {
          result.push(current);
          current = '';
        }
      } else {
        // Unquoted string
        current += char;
      }
    }
  }

  // Add the last argument if there's any
  if (current.length > 0) {
    result.push(current);
  }

  return result;
}

async function func_File_Move(srcPath, destPath) {
  let output = "";
  try {
    // Ensure the destination directory exists
    await fsp.mkdir(path.dirname(destPath), { recursive: true });
    // Move the file
    await fsp.rename(srcPath, destPath);
    output = `File moved from ${srcPath} to ${destPath}`;
    //log( output );
  } catch (error) {
    output = `Error moving file: ${error.stack}`;
    //log( output );
  }
  return output;
}

async function func_File_Copy(srcPath, destPath) {
  let output = "";
  try {
    // Ensure the destination directory exists
    await fsp.mkdir(path.dirname(destPath), { recursive: true });
    // Copy the file
    await fsp.func_File_Copy(srcPath, destPath);
    output = `File copied from ${srcPath} to ${destPath}`;
    //log( output );
  } catch (error) {
    output = `Error copying file: ${error.stack}`;
    //log( output );
  }
  return output;
}

async function func_File_Read(filePath) {
    try {
        //log('In function func_File_Read():');
        // Check if the path is absolute
        if (!path.isAbsolute(filePath)) {
            // If the path is relative, resolve it to an absolute path
            filePath = path.resolve(__dirname, filePath);
        }
        //log('filePath : ',filePath);

        const data = await fsp.readFile(filePath, { encoding: 'utf8' });
        //log('File contents:', data);
        return data; // Return the data if you need to use it later
    } catch (err) {
        //log('Error reading file:', err);
        //throw err; // Re-throw the error if you need to handle it outside
        return `[!] ${err}`; 
    }
}

// Function to execute a command using spawn and return a promise
function func_Spawn_Child(command, args = []) {
  return new Promise((resolve, reject) => {
      const proc = spawn(command, args);
      let stdout = "";
      let stderr = "";

      proc.stdout.on('data', (data) => {
          stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
          stderr += data.toString();
      });

      proc.on('close', (code) => {
          resolve({
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              pid: proc.pid,
              exitCode: code,
              command: `${command} ${args.join(" ")}` // CLI format
          });
      });

      proc.on('error', (err) => {
          reject(err);
      });
  });
}
// function func_Spawn_Child(command, args) {

//   const proc = spawn(command, args);

//   let stdout = proc.stdout.read();
//   let stderr = proc.stderr.read();
//   let code   = proc.exitCode;
//   let pid    = proc.pid;

//   return JSON.stringify( {"stdout":stdout, "stderr":stderr, "pid":pid, "exitCode":code} );
// }

async function func_Drives_Exist(driveLetter) {
  const path = `${driveLetter}:\\`;
  try {
    await fsp.access(path);
    return true;
  } catch {
    return false;
  }
}

async function func_Drives_Stat(driveLetter) {
  const path = `${driveLetter}:\\`;
  try {
    const stats = await fsp.stat(path);
    return stats;
  } catch (error) {
    throw new Error(`Error retrieving stats for ${driveLetter}:: ${error.message}`);
  }
}

async function func_Drives_List() {
  const driveLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  let resultBuffer = '';

  for (const letter of driveLetters) {
    if (await func_Drives_Exist(letter)) {
      resultBuffer += `Drive: ${letter}:\n`;
      try {
        const stats = await func_Drives_Stat(letter);
        resultBuffer += `Created: ${stats.birthtime}\n`;
        resultBuffer += `Modified: ${stats.mtime}\n`;
      } catch (error) {
        resultBuffer += `${error.message}\n`;
      }
      resultBuffer += '---\n';
    }
  }

  return resultBuffer;
}

async function ls(dirPath) {
  try {
    if (dirPath == "") {
      dirPath = ".";
    }
    const filesAndFolders = await fsp.readdir(dirPath, { withFileTypes: true });
    let resultBuffer = '';

    // Table headers
    resultBuffer += `Name`.padEnd(60) + `Type`.padEnd(16) + `Size (bytes)`.padEnd(15) + `Created`.padEnd(24) + `Modified`.padEnd(24) + '\n';
    resultBuffer += '-'.repeat(30) + '-'.repeat(10) + '-'.repeat(15) + '-'.repeat(30) + '-'.repeat(30) + '\n';

    for (const entry of filesAndFolders) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        const stats = await fsp.stat(fullPath);
        const options = { 
          month: '2-digit', 
          day: '2-digit', 
          year: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit', 
          hour12: false 
        };
        resultBuffer += entry.name.padEnd(60);
        resultBuffer += (entry.isDirectory() ? 'Directory' : 'File').padEnd(16);
        resultBuffer += String(stats.size).padEnd(15);
        resultBuffer += stats.birthtime.toLocaleString('en-US', options).replace(',', '').padEnd(24);
        resultBuffer += stats.mtime.toLocaleString('en-US', options).replace(',', '').padEnd(24);
        resultBuffer += '\n';
      } catch (err) {
        //log(`Unable to access file: ${fullPath}. Error: ${err.message}`);
      }
    }

    return resultBuffer;
  } catch (error) {
    //log('Error reading directory:', error);
    return 'Error reading directory.';
  }
}

async function safeStringify(input) {
  if (typeof input === "object" && input !== null) {
      try {
          return JSON.stringify(input);
      } catch (error) {
          console.error("Error stringifying object:", error);
      }
  }
  return input; // Return original value if not a JSON object
}

// Global variable to store the custom DNS server
let customDnsServer = null;

function dnsHandler(command) {
  return new Promise((resolve) => {
    let data = '';

    try {
        const parts = command.split(' ');

        if (parts.length < 2) {
            data += 'Invalid command\r\n';
            return resolve(data);
        }

        // Handle the @ command to set a custom DNS server
        if (parts[1].startsWith('@')) {
            const server = parts[1].substring(1); // Remove the '@'
            
            if (server.toLowerCase() === "default") {
                customDnsServer = null; // Reset to system default
                dns.setServers(dns.getServers()); // Restore system DNS
                data += "Reset to system default DNS servers\r\n";
            } else {
                customDnsServer = server;
                dns.setServers([server]);
                data += `Using custom DNS server: ${server}\r\n`;
            }
            return resolve(data);
        }

        // Use custom DNS if set
        const resolver = customDnsServer ? new dns.Resolver() : dns;
        if (customDnsServer) resolver.setServers([customDnsServer]);

        switch (parts[1]) {
            case 'lookup':
                if (parts[2]) {
                    if (parts.includes('-all')) {
                        let hostname = parts[2];
                        let pendingLookups = 7; // Total lookups being performed

                        // Function to check when all lookups are done
                        const finalize = () => {
                            pendingLookups--;
                            if (pendingLookups === 0) {
                                resolve(data);
                            }
                        };

                        // Resolve IP Address
                        resolver.lookup(hostname, (err, address, family) => {
                            data += err ? `Error resolving IP: ${err.message}\r\n` 
                                        : `Resolved IP: ${address}, Family: IPv${family}\r\n`;
                            finalize();
                        });

                        // Resolve A (IPv4) & AAAA (IPv6)
                        resolver.resolve4(hostname, (err, addresses) => {
                            data += err ? `Error resolving A record: ${err.message}\r\n`
                                        : `A (IPv4) Records: ${addresses.join(', ')}\r\n`;
                            finalize();
                        });

                        resolver.resolve6(hostname, (err, addresses) => {
                            data += err ? `Error resolving AAAA record: ${err.message}\r\n`
                                        : `AAAA (IPv6) Records: ${addresses.join(', ')}\r\n`;
                            finalize();
                        });

                        // Resolve MX Records
                        resolver.resolveMx(hostname, (err, addresses) => {
                            data += err ? `Error resolving MX records: ${err.message}\r\n`
                                        : `MX Records: ${JSON.stringify(addresses, null, 2)}\r\n`;
                            finalize();
                        });

                        // Resolve TXT Records
                        resolver.resolveTxt(hostname, (err, records) => {
                            data += err ? `Error resolving TXT records: ${err.message}\r\n`
                                        : `TXT Records: ${JSON.stringify(records, null, 2)}\r\n`;
                            finalize();
                        });

                        // Resolve CNAME Records
                        resolver.resolveCname(hostname, (err, records) => {
                            data += err ? `Error resolving CNAME records: ${err.message}\r\n`
                                        : `CNAME Records: ${records.join(', ')}\r\n`;
                            finalize();
                        });

                        // Resolve NS Records
                        resolver.resolveNs(hostname, (err, records) => {
                            data += err ? `Error resolving NS records: ${err.message}\r\n`
                                        : `NS Records: ${records.join(', ')}\r\n`;
                            finalize();
                        });

                    } else {
                        resolver.lookup(parts[2], (err, address, family) => {
                            data += err ? `Error: ${err.message}\r\n` 
                                        : `IP Address: ${address}, Family: IPv${family}\r\n`;
                            resolve(data);
                        });
                    }
                } else {
                    data += 'Usage: dns lookup <hostname> [-all | -mx | -txt | -cname]\r\n';
                    resolve(data);
                }
                break;

            case 'resolve':
                if (parts[2]) {
                    resolver.resolve(parts[2], (err, addresses) => {
                        data += err ? `Error: ${err.message}\r\n` 
                                    : `IP Addresses: ${addresses.join(', ')}\r\n`;
                        resolve(data);
                    });
                } else {
                    data += 'Usage: dns resolve <hostname>\r\n';
                    resolve(data);
                }
                break;

            case 'reverse':
                if (parts[2]) {
                    resolver.reverse(parts[2], (err, hostnames) => {
                        data += err ? `Error: ${err.message}\r\n` 
                                    : `Hostnames: ${hostnames.join(', ')}\r\n`;
                        resolve(data);
                    });
                } else {
                    data += 'Usage: dns reverse <ip-address>\r\n';
                    resolve(data);
                }
                break;

            case 'config':
                try {
                    data += `Current DNS Servers: ${dns.getServers().join(', ')}\r\n`;
                } catch (error) {
                    data += `Error retrieving DNS config: ${error.message}\r\n`;
                }
                resolve(data);
                break;

            default:
                data += 'Unknown command\r\n';
                resolve(data);
        }
    } catch (error) {
        data += `Unexpected error: ${error.message}\r\n${error.stack}\r\n`;
        resolve(data);
    }
});
}

// Function to simulate doing some work with the blob content
async function func_Command_Handler(cmd) 
{
try
{
  //log('# func_Command_Handler()');
  //log(`cmdline : ${cmd}`);
  if ( cmd != "")
  {
      const argv = func_Split_Quoted_String(cmd);
      log(`handler.js | func_Command_Handler | cmd : ${argv}`);
      //log(`[+] argv: ${argv}`);
      if (argv[0] != "")
      {
        let data;
        let clearResponse;
        let response;
        const arg1 = argv.length > 0 ? argv[1] : '';
        const args = argv.slice(2);
        //log(`# CMD ARGS \r\n\targv : ${argv[0]}\r\n\targ1 : ${arg1}\r\n\targs : ${args}`);
        //log('[+] Command : ', argv[0]);
        if (argv[0] == 'spawn')
        {
            log('command:', arg1);
            log('args   :', args);
            data = await func_Spawn_Child(arg1, args);
            //data = safeStringify(data);
            data = data.stdout;
            log('Command Output:', data);
        }
        if (argv[0] == 'scan') {
          const host = argv[1];
          const portsArg = argv.find(arg => arg.startsWith('-p'));
          const ports = portsArg ? portsArg.substring(2).split(',').map(Number) : [80, 443]; // Default ports if not specified
          
          const isCIDR = host.includes('/');
          if (isCIDR) {
            const [base, mask] = host.split('/');
            const baseIP = base.split('.').map(Number);
            const range = 1 << (32 - Number(mask));
            const openPorts = [];

            for (let i = 0; i < range; i++) {
              const ip = baseIP.slice();
              ip[3] += i;
              const ipStr = ip.join('.');
              const result = await func_Scan_Ports(ipStr, ports);
              // if (result.length > 0) {
              openPorts.push(`${ipStr}: ${result.join(', ')}`);
              // } //else {
              // openPorts.push(`${ipStr}: none`);
              // }
            }
            data = openPorts.join('\n');
          } else {
            const result = await func_Scan_Ports(host, ports);
            data = `${host}: ${result.join(', ')}`;
          }
        }
        if (argv[0] == 'dns')
        {
          data = await dnsHandler(cmd);
        }
        if (argv[0] == 'set')
        {
          if (argv[1] == 'scexec_path')
          {
            global.scexecNodePath   = argv[2];
            data = `SCEXEC Node Load Path Set to : ${global.scexecNodePath}`;
            log(data);
          }
          else if (argv[1] == 'assembly_path')
          {
            global.assemblyNodePath = argv[2];
            data = `Assembly Node Load Path Set to : ${global.assemblyNodePath}`;
            log(data);

          }else
          {
            data = `SCEXEC Node Load Path Set to : ${global.scexecNodePath}\r\nAssembly Node Load Path Set to : ${global.assemblyNodePath}`;
            log(data);
          }
        }
        if (argv[0] == 'drives')
        {
          data = await func_Drives_List();
        }
        if (argv[0] == 'ls')
        {
          let path;
          if (typeof argv[1] === 'undefined')
            {
              path = ".";
            }else{
              path = argv[1];
            }
          data = await ls(path);
        }
        if (argv[0] == 'env')
        {
          //data = process.env;
          //data = common.func_Base64_Encode(data);
          let env = process.env;
          data    = JSON.stringify(env, null, 2);
          //log(env);
        }
        if (argv[0] == 'cat')
        {
          file  = argv[1];
          data = await func_File_Read(file);
        }
        if (argv[0] == 'pwd')
        {
          data = process.cwd().replace(/\\/g, '/');;
        }
        if (argv[0] == 'sleep')
        {
          sleepInterval = await validateAndAdjustNumber(Number(argv[1]), 3000, 0, max = 30000);
          jitter        = await validateAndAdjustNumber(Number(argv[2]), 15, 0, max = 300);
          data = `Sleeping for ${sleepInterval}ms with ${jitter} percent jitter.`;
        }
        if (argv[0] == 'mv')
        {
          src  = argv[1];
          dest = argv[2];
          data = await func_File_Move(src,dest);
        }
        if (argv[0] == 'cp')
        {
          src  = argv[1];
          dest = argv[2];
          data = await func_File_Copy(src,dest);
        }
        if (argv[0] == 'ps')
        {
          if (wpt == null)
          {
            data = "wpt.node failed to load so no ps cmd available."
          }
          else
          {
            await getProcessListWrapper();
            await new Promise(resolve => setTimeout(resolve, 2000));
            data = processList;
          }
        }
        return data;
    }
  } 
}catch(error)
{
    return error;
}
}

module.exports = {
  func_Command_Handler
};