/**
 * Popup UI Controller
 */

let sessionCount = 0;

// Load status on popup open
document.addEventListener('DOMContentLoaded', async () => {
  await updateStatus();
  await updateStats();
  
  // Set up toggle button
  document.getElementById('toggleButton').addEventListener('click', toggleExtension);
  
  // Refresh status every 2 seconds
  setInterval(updateStatus, 2000);
});

// Get current status from background script
async function updateStatus() {
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Status check error:', chrome.runtime.lastError);
      return;
    }
    
    const { enabled, nativeConnected } = response;
    
    // Update extension status
    const extensionIndicator = document.getElementById('extensionStatus');
    const extensionText = document.getElementById('extensionStatusText');
    
    if (enabled) {
      extensionIndicator.className = 'status-indicator active';
      extensionText.textContent = 'Active';
      extensionText.style.color = '#10b981';
      extensionText.style.fontWeight = '600';
    } else {
      extensionIndicator.className = 'status-indicator inactive';
      extensionText.textContent = 'Paused';
      extensionText.style.color = '#ef4444';
      extensionText.style.fontWeight = '600';
    }
    
    // Update native app status
    const nativeIndicator = document.getElementById('nativeStatus');
    const nativeText = document.getElementById('nativeStatusText');
    
    if (nativeConnected) {
      nativeIndicator.className = 'status-indicator active';
      nativeText.textContent = 'Connected';
      nativeText.style.color = '#10b981';
      nativeText.style.fontWeight = '600';
    } else {
      nativeIndicator.className = 'status-indicator inactive';
      nativeText.textContent = 'Not connected';
      nativeText.style.color = '#f59e0b';
      nativeText.style.fontWeight = '600';
    }
    
    // Update toggle button
    const toggleButton = document.getElementById('toggleButton');
    const buttonText = document.getElementById('buttonText');
    
    if (enabled) {
      toggleButton.className = 'toggle-button disabled';
      buttonText.textContent = '⏸ Pause Auto-Capture';
    } else {
      toggleButton.className = 'toggle-button';
      buttonText.textContent = '▶ Resume Auto-Capture';
    }
  });
}

// Update job statistics
async function updateStats() {
  chrome.storage.local.get(['pendingJobs'], (result) => {
    const jobs = result.pendingJobs || [];
    
    // Total jobs captured
    document.getElementById('jobCount').textContent = jobs.length;
    
    // Jobs captured in this session (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    sessionCount = jobs.filter(job => 
      new Date(job.capturedAt) > oneHourAgo
    ).length;
    document.getElementById('sessionCount').textContent = sessionCount;
  });
}

// Toggle extension on/off
function toggleExtension() {
  chrome.runtime.sendMessage({ type: 'TOGGLE_ENABLED' }, async (response) => {
    if (chrome.runtime.lastError) {
      console.error('Toggle error:', chrome.runtime.lastError);
      return;
    }
    
    await updateStatus();
    
    // Show feedback
    const button = document.getElementById('toggleButton');
    const originalText = button.querySelector('#buttonText').textContent;
    button.querySelector('#buttonText').textContent = response.enabled ? 
      '✓ Activated!' : '✓ Paused!';
    
    setTimeout(() => {
      updateStatus();
    }, 1000);
  });
}

// Listen for storage changes (new jobs)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.pendingJobs) {
    updateStats();
  }
});
