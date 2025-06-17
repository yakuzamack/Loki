const { ipcRenderer } = require('electron');
const path = require('path');
const { log } = require('console');
let tableinit = false;

function logMain(message) 
{
    const timestamp = new Date().toISOString();
    log(`[${timestamp}] ${message}`);
}

function timeDifference(oldTimestamp) {
    const now = Date.now();
    let diff = now - oldTimestamp;

    // Calculate the differences in various units
    const msInSecond = 1000;
    const msInMinute = msInSecond * 60;
    const msInHour = msInMinute * 60;
    const msInDay = msInHour * 24;

    const days = Math.floor(diff / msInDay);
    diff %= msInDay;
    const hours = Math.floor(diff / msInHour);
    diff %= msInHour;
    const minutes = Math.floor(diff / msInMinute);
    diff %= msInMinute;
    const seconds = Math.floor(diff / msInSecond);

    // Build the result string
    let result = '';
    if (days > 0) result += `${days}d, `;
    if (hours > 0) result += `${hours}h, `;
    if (minutes > 0) result += `${minutes}m, `;
    if (seconds > 0 || result === '') result += `${seconds}s`;

    return result.trim().replace(/,\s*$/, ''); // Remove trailing comma and space
}

// Function to parse time strings back to milliseconds for sorting
function parseTimeStringToMilliseconds(timeString) {
    if (!timeString || timeString.trim() === '') return 0;
    
    let totalMs = 0;
    const msInSecond = 1000;
    const msInMinute = msInSecond * 60;
    const msInHour = msInMinute * 60;
    const msInDay = msInHour * 24;
    
    // Parse patterns like "1d, 3h, 5m, 2s" or just "11s"
    const dayMatch = timeString.match(/(\d+)d/);
    const hourMatch = timeString.match(/(\d+)h/);
    const minuteMatch = timeString.match(/(\d+)m/);
    const secondMatch = timeString.match(/(\d+)s/);
    
    if (dayMatch) totalMs += parseInt(dayMatch[1]) * msInDay;
    if (hourMatch) totalMs += parseInt(hourMatch[1]) * msInHour;
    if (minuteMatch) totalMs += parseInt(minuteMatch[1]) * msInMinute;
    if (secondMatch) totalMs += parseInt(secondMatch[1]) * msInSecond;
    
    return totalMs;
}

window.addEventListener('DOMContentLoaded', () => {
    let sortState = { column: null, order: 'none' };

    document.querySelectorAll('th').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-column');
            if (sortState.column === column) {
                sortState.order = sortState.order === 'none' ? 'asc' : sortState.order === 'asc' ? 'desc' : 'none';
            } else {
                sortState.column = column;
                sortState.order = 'asc';
            }
            logMain(`${sortState['column']} column sort set to ${sortState['order']}`);
            updateTableSort();
        });
    });

    const table = document.getElementById('containerTable');
    if (!table) return;
    table.removeEventListener('contextmenu', handleContextMenu);
    table.addEventListener('contextmenu', handleContextMenu);
});

// **Ensure the event fires only once**
async function handleContextMenu(event) {
    event.preventDefault();
    log("Right-click detected on table row");
    log(`event : ${JSON.stringify(event)}`);
    if(tableinit === true) {
        let row = event.target.closest("tr");
        log(`row : ${JSON.stringify(row)}`);
        if (!row || row.rowIndex === 0) return;

        // Get the agentid for the clicked row
        let agentid = row.cells[0]?.textContent || '';
        
        // Get links for this agent
        let links = await ipcRenderer.invoke('get-agent-links', agentid);
        log(`[DASHBOARD] links : ${links}`);

        // Create array to store all agent data
        let allAgentData = [];

        // Get data for the clicked agent
        let clickedAgentData = {
            agentid: agentid,
            containerid: row.cells[1]?.textContent || '',
            hostname: row.cells[2]?.textContent || '',
            username: row.cells[3]?.textContent || '',
            fileName: row.cells[4]?.textContent || '',
            PID: row.cells[5]?.textContent || '',
            IP: row.cells[6]?.textContent || '',
            arch: row.cells[7]?.textContent || '',
            platform: row.cells[8]?.textContent || '',
            mode: row.cells[9]?.textContent || '',
            links: links
        };
        allAgentData.push(clickedAgentData);

        // If there are links, get data for each linked agent
        if (links) {
            let linkedAgentIds = links.split(',');
            for (let linkedAgentId of linkedAgentIds) {
                linkedAgentId = linkedAgentId.trim();
                // Skip if this is the same as the clicked agent
                if (linkedAgentId === agentid) {
                    continue;
                }
                
                // Find the row for this linked agent
                let table = document.getElementById('containerTable').getElementsByTagName('tbody')[0];
                for (let tableRow of table.rows) {
                    if (tableRow.cells[0].textContent === linkedAgentId) {
                        let linkedAgentData = {
                            agentid: linkedAgentId,
                            containerid: tableRow.cells[1]?.textContent || '',
                            hostname: tableRow.cells[2]?.textContent || '',
                            username: tableRow.cells[3]?.textContent || '',
                            fileName: tableRow.cells[4]?.textContent || '',
                            PID: tableRow.cells[5]?.textContent || '',
                            IP: tableRow.cells[6]?.textContent || '',
                            arch: tableRow.cells[7]?.textContent || '',
                            platform: tableRow.cells[8]?.textContent || '',
                            mode: tableRow.cells[9]?.textContent || '',
                            links: await ipcRenderer.invoke('get-agent-links', linkedAgentId)
                        };
                        allAgentData.push(linkedAgentData);
                        break;
                    }
                }
            }
        }

        log(`allAgentData : ${JSON.stringify(allAgentData)}`);
        ipcRenderer.send('show-row-context-menu', JSON.stringify(allAgentData));
    }
}


window.addEventListener('DOMContentLoaded', async () => {
    let sortState = {
        column: null,
        order: 'none' // 'asc', 'desc', 'none'
    };
    document.querySelectorAll('th').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-column');
            if (sortState.column === column) {
                if (sortState.order === 'none') {
                    sortState.order = 'asc';
                } else if (sortState.order === 'asc') {
                    sortState.order = 'desc';
                } else {
                    sortState.order = 'none';
                }
            } else {
                sortState.column = column;
                sortState.order = 'asc';
            }
            logMain(`${sortState['column']} column sort set to ${sortState['order']}`);
            updateTableSort();
        });


    });
    const table = document.getElementById('containerTable');
    if (!table) return;

    table.removeEventListener('contextmenu', handleContextMenu);
    log("Adding event listener context menu");
	table.addEventListener('contextmenu', handleContextMenu);

    async function updateTable() {
        try {
            let agentcheckins;
            agentcheckins = await ipcRenderer.invoke('get-containers');
            // log(`[DASHBOARD] agentcheckins : ${agentcheckins}`);
            if (agentcheckins != 0) {
                const agents = JSON.parse(agentcheckins);
                let agent_index = 0;
                agents.forEach(agent => {
                    agent_index++;
                    if (agent != 0)
                    {
                        let thisrow = updateOrAddRow(agent);
                        let isnewrow = false;
        
                        if (thisrow.cells[2].textContent == '-' || !thisrow.cells[0].textContent) {
                            isnewrow = true;
                        }
                        const filePath = agent.Process.trim();
                        let fileName;
                        if (filePath.includes("\\") && !filePath.includes("/")) {
                            fileName = path.win32.basename(filePath);
                        } else if (filePath.includes("/") && !filePath.includes("\\")) {
                            fileName = path.posix.basename(filePath);
                        } else {
                            fileName = filePath.split(/[/\\]/).pop();
                        }
                        let platformName = agent.platform;

                        if (agent.platform === "darwin") {
                            platformName = "macOS";
                        } else if (agent.platform === "win32") {
                            platformName = "Windows";
                        } else if (agent.platform === "linux") {
                            platformName = "Linux";
                        } 
                        // Update cell content only if it has changed
                        if (thisrow.cells[0].textContent !== agent.agentid) thisrow.cells[0].textContent = agent.agentid;
                        if (thisrow.cells[1].textContent !== agent.container) thisrow.cells[1].textContent = agent.container;
                        if (thisrow.cells[2].textContent !== agent.hostname) thisrow.cells[2].textContent = agent.hostname;
                        if (thisrow.cells[3].textContent !== agent.username) thisrow.cells[3].textContent = agent.username;
                        if (thisrow.cells[4].textContent !== fileName) thisrow.cells[4].textContent = fileName;
                        if (thisrow.cells[5].textContent !== agent.PID) thisrow.cells[5].textContent = agent.PID;
                        if (thisrow.cells[6].textContent !== agent.IP) thisrow.cells[6].textContent = agent.IP;
                        if (thisrow.cells[7].textContent !== agent.arch) thisrow.cells[7].textContent = agent.arch;
                        if (thisrow.cells[8].textContent !== platformName) thisrow.cells[8].textContent = platformName;
                        if (thisrow.cells[9].textContent !== agent.mode) thisrow.cells[9].textContent = agent.mode;
                        if (thisrow.cells[10].textContent !== timeDifference(agent.checkin)) thisrow.cells[10].textContent = timeDifference(agent.checkin);
                        
                        // Only add click listener if this is a new row or if listener was removed
                        if (isnewrow || !thisrow.hasAttribute('data-click-listener')) {
                            thisrow.addEventListener('click', () => {
                                console.log("Row clicked!");
                                ipcRenderer.send('open-container-window', agent.agentid);
                            });
                            thisrow.setAttribute('data-click-listener', 'true');
                        }
                    }
                });
                updateTableSort();
				tableinit = true;
            }
        }catch (error) {
            logMain(`Error in index.js updateTable() updating table: ${error} ${error.stack}`);
        }
    }

    function updateOrAddRow(agent) {
        try
        {
            let rowExists = false;
            let thisRow;
            let table = document.getElementById('containerTable').getElementsByTagName('tbody')[0];
            //logMain(`Attempting to find match in table for agent ${agent.agentid}`);

            for (let row of table.rows) {
                //logMain(`row.cells[0].textContent ${row.cells[0].textContent} =? ${agent.agentid}`);
                if (row.cells[0].textContent == agent.agentid) {
                    thisRow = row;
                    rowExists = true;
                    //logMain(`Matched row for agent ${agent.agentid}`);
                    break;
                }
            }
            if(!rowExists)
            { 
                //logMain(`Failed to match row for agent ${agent.agentid}`);
                thisRow = table.insertRow();
                thisRow.insertCell(0);
                thisRow.insertCell(1);
                thisRow.insertCell(2);
                thisRow.insertCell(3);
                thisRow.insertCell(4);
                thisRow.insertCell(5);
                thisRow.insertCell(6);
                thisRow.insertCell(7);
                thisRow.insertCell(8);
                thisRow.insertCell(9);
                thisRow.insertCell(10);  // Add cell for check-in time
            }
            return thisRow;
        }catch(error)
        {
            logMain(`Error in updateOrAddRow() : ${error} ${error.stack}`);
        }
    }

    function updateTableSort() {
        const tbody = document.querySelector('#containerTable tbody');
        const rows = Array.from(tbody.rows);

        if (sortState.order === 'none') {
            rows.sort((a, b) => a.rowIndex - b.rowIndex);
        } else {
            rows.sort((a, b) => {
                const aText = a.querySelector(`td:nth-child(${getColumnIndex(sortState.column)})`).textContent.trim();
                const bText = b.querySelector(`td:nth-child(${getColumnIndex(sortState.column)})`).textContent.trim();
                
                // Special handling for checkin column (time sorting)
                if (sortState.column === 'checkin') {
                    const aTime = parseTimeStringToMilliseconds(aText);
                    const bTime = parseTimeStringToMilliseconds(bText);
                    return sortState.order === 'asc' ? aTime - bTime : bTime - aTime;
                } else {
                    return sortState.order === 'asc' ? aText.localeCompare(bText) : bText.localeCompare(aText);
                }
            });
        }

        rows.forEach(row => tbody.appendChild(row));
        updateArrows();
    }

    function getColumnIndex(column) {
        return Array.from(document.querySelectorAll('th')).findIndex(th => th.getAttribute('data-column') === column) + 1;
    }

    function updateArrows() {
        document.querySelectorAll('.arrow').forEach(arrow => {
            arrow.textContent = '';
        });
        if (sortState.order !== 'none') {
            const arrow = document.querySelector(`#${sortState.column}Arrow`);
            arrow.textContent = sortState.order === 'asc' ? '▲' : '▼';
        }
    }

    // Initial table update
//    await initTable();
    await updateTable();

    // Update the table every second
    setInterval(updateTable, 1000);
});

ipcRenderer.on('remove-table-row', (event, agentId) => {
    logMain(`Removing row for agent ID: ${agentId}`);
    let table = document.getElementById('containerTable').getElementsByTagName('tbody')[0];
    for (let row of table.rows) {
        if (row.cells[0].textContent.trim() === agentId.trim()) {
            row.remove(); // Remove the row from the table
            logMain(`Row for agent ${agentId} removed.`);
            break;
        }
    }
});

ipcRenderer.on('make-web-request', async (event, requestOptions) => {
    try {
        const { url, method = 'GET', headers = {}, body, requestId } = requestOptions;
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
        const contentType = response.headers.get('content-type');
        if (contentType && (
            contentType.includes('application/octet-stream') ||
            contentType.includes('application/x-binary') ||
            contentType.includes('application/x-msdownload') ||
            contentType.includes('application/zip') ||
            contentType.includes('application/pdf') ||
            contentType.includes('image/') ||
            contentType.includes('video/') ||
            contentType.includes('audio/')
        )) {
            const arrayBuffer = await response.arrayBuffer();
            data = Buffer.from(arrayBuffer);
        } else {
            data = await response.text();
        }
        ipcRenderer.send(`web-request-response-${requestId}`, {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            data: data
        });
    } catch (error) {
        ipcRenderer.send(`web-request-response-${requestId}`, {
            error: error.message
        });
    }
});
