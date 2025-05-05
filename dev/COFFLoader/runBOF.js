const COFFLoader = require('./build/Release/COFFLoader');
const fs = require('fs');

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

function runBOF() {
    try {
        // Get command line arguments
        const args = process.argv.slice(2);
        if (args.length < 2) {
            console.error('Usage: bof <path_to_coff_file> <function_name> <format_string> [args...]');
            console.error('Format specifiers:');
            console.error('  z = null-terminated string (char*)');
            console.error('  i = 4-byte integer (int)'); 
            console.error('  b = binary blob (void*, length)');
            console.error('  w = wide string (wchar_t*)');
            process.exit(1);
        }

        // Read COFF file from command line path
        const coffData = fs.readFileSync(args[0]);
        console.log(`[BOF] coffData.length: ${coffData.length}`);

        // Get format string and validate arguments
        const functionName = args[1];
        const formatString = args[2];
        const formatArgs = args.slice(3);
        
        // if (formatArgs.length !== formatString.length) {
        //     console.error(`[BOF] Error: Format string "${formatString}" requires ${formatString.length} arguments but got ${formatArgs.length}`);
        //     process.exit(1);
        // }

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
        console.log('[BOF] Packed argument data:', argumentData.toString('hex'));
        
        // Call the native function
        const result = COFFLoader.runCOFF(
            functionName,  // The name of the function to call in the COFF file
            coffData,           // The COFF file contents as a Buffer
            argumentData,       // Arguments to pass to the function
            argumentData.length // Size of the arguments
        );
        
        console.log('[BOF] RunCOFF status:', result.status);
        if (result.output) {
            console.log('[BOF] Output:', result.output.toString());
        } else {
            console.log('[BOF] No output data');
        }
    } catch (error) {
        console.error('[BOF] Error:', error);
    }
}

runBOF();
