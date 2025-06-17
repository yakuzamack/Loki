const { ipcRenderer } = require('electron');

let currentAgent = null;
let allTasks = [];
let filteredTasks = [];
let currentFilter = 'all';
let isEditing = false;
let expandedTaskId = null; // Track which task is expanded

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    // Auto-refresh every 2 seconds, but only if not editing
    setInterval(() => {
        if (!isEditing) {
            refreshTasks();
        }
    }, 2000);
});

// Listen for agent data from main process
ipcRenderer.on('agent-data', (event, agent) => {
    currentAgent = agent;
    updateAgentInfo();
    refreshTasks();
});

// Listen for real-time task updates
ipcRenderer.on('task-removed', (event, taskId) => {
    removeTaskFromList(taskId);
    refreshDisplay();
});

ipcRenderer.on('task-modified', (event, task) => {
    updateTaskInList(task);
    refreshDisplay();
});

ipcRenderer.on('tasks-reordered', (event, tasks) => {
    allTasks = tasks || [];
    refreshDisplay();
});

function setupEventListeners() {
    // Filter change
    document.getElementById('statusFilter').addEventListener('change', filterTasks);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
            event.preventDefault();
            refreshTasks();
        }
        if (event.key === 'Escape') {
            // Cancel any active editing
            cancelAllEditing();
        }
    });
}

function updateAgentInfo() {
    if (!currentAgent) return;
    
    document.getElementById('agentId').textContent = currentAgent.agentid || 'Unknown';
    
    const details = [
        currentAgent.hostname || 'Unknown Host',
        currentAgent.username || 'Unknown User',
        Array.isArray(currentAgent.IP) ? currentAgent.IP.join(', ') : (currentAgent.IP || 'Unknown IP')
    ].join(' • ');
    
    document.getElementById('agentDetails').textContent = details;
}

async function refreshTasks() {
    if (!currentAgent) return;
    
    try {
        const tasks = await ipcRenderer.invoke('get-agent-tasks', currentAgent.agentid);
        allTasks = tasks || [];
        refreshDisplay();
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

function refreshDisplay() {
    updateStats();
    filterTasks();
}

function updateStats() {
    const stats = {
        starting: 0,
        queued: 0,
        processing: 0,
        completed: 0,
        error: 0
    };
    
    allTasks.forEach(task => {
        if (stats.hasOwnProperty(task.status)) {
            stats[task.status]++;
        }
    });
    
    document.getElementById('queuedCount').textContent = stats.queued;
    document.getElementById('processingCount').textContent = stats.processing;
    document.getElementById('completedCount').textContent = stats.completed;
    document.getElementById('errorCount').textContent = stats.error;
}

function filterTasks() {
    const filter = document.getElementById('statusFilter').value;
    currentFilter = filter;
    
    if (filter === 'all') {
        filteredTasks = [...allTasks];
    } else {
        filteredTasks = allTasks.filter(task => task.status === filter);
    }
    
    renderTasks();
}

function renderTasks() {
    const taskList = document.getElementById('taskList');
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = '<div class="no-tasks">No tasks found</div>';
        return;
    }
    
    taskList.innerHTML = '';
    
    filteredTasks.forEach((task, index) => {
        const taskElement = createTaskElement(task, index);
        taskList.appendChild(taskElement);
        // Add click handler for completed or error tasks to expand/collapse
        if (task.status === 'completed' || task.status === 'error') {
            taskElement.addEventListener('click', (e) => {
                // Only expand/collapse if not clicking a button
                if (e.target.classList.contains('action-btn')) return;
                if (expandedTaskId === task.taskid) {
                    expandedTaskId = null;
                } else {
                    expandedTaskId = task.taskid;
                }
                renderTasks();
            });
        }
    });
}

function createTaskElement(task, index) {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item ${task.status === 'processing' ? 'processing' : ''}`;
    taskItem.dataset.taskId = task.taskid;
    
    const queuePosition = currentFilter === 'queued' ? index + 1 : null;
    
    let outputSection = '';
    if ((task.status === 'completed' || task.status === 'error') && expandedTaskId === task.taskid) {
        outputSection = `<div class="task-output" style="margin-top:10px; background:#18191a; border-radius:4px; padding:10px; color:#bdbdbd; font-size:13px; white-space:pre-wrap;">${escapeHtml(task.output || (task.status === 'error' ? 'No error output' : 'No output'))}</div>`;
    }
    
    taskItem.innerHTML = `
        ${queuePosition ? `<div class="queue-position">${queuePosition}</div>` : ''}
        <div class="task-info">
            <div class="task-command" id="command-${task.taskid}">${escapeHtml(task.command)}</div>
            <div class="task-meta">
                <span class="task-status status-${task.status}">${task.status}</span>
                <span>ID: ${task.taskid}</span>
                <span>Output: ${task.outputChannel || 'N/A'}</span>
                <span>Upload: ${task.uploadChannel || 'N/A'}</span>
            </div>
            ${outputSection}
        </div>
        <div class="task-actions">
            ${createActionButtons(task)}
        </div>
    `;
    
    return taskItem;
}

function createActionButtons(task) {
    const isProcessing = task.status === 'processing';
    const isCompleted = task.status === 'completed';
    const isError = task.status === 'error';
    const isQueued = task.status === 'queued';
    const canModify = !isProcessing && !isCompleted && !isError;
    let buttons = '';

    // No edit or remove for error tasks
    if (isError) {
        return buttons;
    }

    if (canModify) {
        buttons += `<button class="action-btn" onclick="editTask('${task.taskid}')" title="Edit Command">✏️</button>`;
    }

    // For queued tasks, show a red X for removal (no prompt)
    if (isQueued) {
        buttons += `<button class="action-btn" style="color:#f44336;" onclick="removeTaskNoPrompt('${task.taskid}')" title="Remove Task">❌</button>`;
    } else if (canModify) {
        // For other modifiable tasks (shouldn't happen, but fallback)
        buttons += `<button class="action-btn" onclick="removeTask('${task.taskid}')" title="Remove Task">��️</button>`;
    }

    if (isProcessing) {
        buttons += `<span class="action-btn" style="opacity: 0.5;" title="Processing...">⏳</span>`;
    }

    return buttons;
}

async function editTask(taskId) {
    const task = allTasks.find(t => t.taskid === taskId);
    if (!task) return;
    
    isEditing = true;
    
    const commandElement = document.getElementById(`command-${taskId}`);
    const originalCommand = task.command;
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-input';
    input.value = originalCommand;
    
    // Replace command text with input
    commandElement.innerHTML = '';
    commandElement.appendChild(input);
    input.focus();
    input.select();
    
    // Handle save/cancel
    const saveEdit = async () => {
        const newCommand = input.value.trim();
        if (newCommand && newCommand !== originalCommand) {
            try {
                const result = await ipcRenderer.invoke('modify-task', currentAgent.agentid, taskId, newCommand);
                if (result.success) {
                    task.command = newCommand;
                    commandElement.textContent = newCommand;
                } else {
                    alert(`Error: ${result.message}`);
                    commandElement.textContent = originalCommand;
                }
            } catch (error) {
                console.error('Error modifying task:', error);
                alert('Error modifying task');
                commandElement.textContent = originalCommand;
            }
        } else {
            commandElement.textContent = originalCommand;
        }
        isEditing = false;
    };
    
    const cancelEdit = () => {
        commandElement.textContent = originalCommand;
        isEditing = false;
    };
    
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveEdit();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            cancelEdit();
        }
    });
    
    input.addEventListener('blur', saveEdit);
}

// Remove task immediately, no prompt
async function removeTaskNoPrompt(taskId) {
    try {
        const result = await ipcRenderer.invoke('remove-task', currentAgent.agentid, taskId);
        if (result.success) {
            removeTaskFromList(taskId);
            refreshDisplay();
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Error removing task:', error);
        alert('Error removing task');
    }
}

async function moveTask(taskId, direction) {
    try {
        const result = await ipcRenderer.invoke('reorder-task', currentAgent.agentid, taskId, direction);
        if (!result.success) {
            alert(`Error: ${result.message}`);
        }
        // The tasks-reordered event will handle the UI update
    } catch (error) {
        console.error('Error moving task:', error);
        alert('Error moving task');
    }
}

// Remove completed and error tasks
async function clearCompleted() {
    const completedOrErrorTasks = allTasks.filter(task => task.status === 'completed' || task.status === 'error');
    if (completedOrErrorTasks.length === 0) {
        alert('No completed or error tasks to clear');
        return;
    }
    if (!confirm(`Are you sure you want to remove ${completedOrErrorTasks.length} completed/error task(s)?`)) {
        return;
    }
    try {
        for (const task of completedOrErrorTasks) {
            await ipcRenderer.invoke('remove-task', currentAgent.agentid, task.taskid);
        }
        refreshTasks();
    } catch (error) {
        console.error('Error clearing completed/error tasks:', error);
        alert('Error clearing completed/error tasks');
    }
}

function removeTaskFromList(taskId) {
    allTasks = allTasks.filter(task => task.taskid !== taskId);
}

function updateTaskInList(updatedTask) {
    const index = allTasks.findIndex(task => task.taskid === updatedTask.taskid);
    if (index !== -1) {
        allTasks[index] = updatedTask;
    }
}

function cancelAllEditing() {
    if (isEditing) {
        const activeInput = document.querySelector('.edit-input');
        if (activeInput) {
            activeInput.dispatchEvent(new Event('blur'));
        }
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
} 