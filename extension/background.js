/**
 * Background Service Worker
 * Handles communication between content scripts and desktop app via HTTP
 */

let isEnabled = true;

// Load settings from storage
chrome.storage.local.get(['enabled'], (result) => {
  isEnabled = result.enabled !== false;
  console.log('📋 Job Search Assistant loaded, auto-capture:', isEnabled ? 'ON' : 'OFF');
});

// Listen for job data from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'JOB_DETECTED') {
    if (!isEnabled) {
      console.log('⏸ Auto-capture paused, ignoring job');
      sendResponse({ success: false, reason: 'Extension disabled' });
      return;
    }

    const jobTitle = message.job.title || 'Untitled';
    const jobCompany = message.job.company || 'Unknown Company';
    console.log('📋 Job detected:', jobTitle, 'at', jobCompany);
    console.log('🔗 URL:', message.job.url);
    
    // Send to desktop app via HTTP (port 45782)
    sendToDesktopApp(message.job)
      .then(() => {
        console.log('✅ Sent to desktop app successfully');
        sendResponse({ success: true, method: 'http' });
      })
      .catch((error) => {
        console.warn('⚠ Desktop app not reachable:', error.message);
        console.log('💾 Storing locally instead');
        storeJobLocally(message.job);
        sendResponse({ success: true, method: 'local' });
      });
    
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'GET_STATUS') {
    // Check desktop app connectivity by attempting connection
    checkDesktopAppConnection()
      .then(connected => {
        sendResponse({ 
          enabled: isEnabled,
          nativeConnected: connected
        });
      })
      .catch(() => {
        sendResponse({ 
          enabled: isEnabled,
          nativeConnected: false
        });
      });
    return true;
  }
  
  if (message.type === 'TOGGLE_ENABLED') {
    isEnabled = !isEnabled;
    chrome.storage.local.set({ enabled: isEnabled });
    sendResponse({ enabled: isEnabled });
    return true;
  }
});

// Send job to desktop app via TCP socket
async function sendToDesktopApp(job) {
  const url = 'http://127.0.0.1:45782';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'JOB_DETECTED',
      job: job
    })
  });
  
  if (!response.ok) {
    throw new Error('Desktop app returned error');
  }
  
  return response.json();
}

// Check if desktop app is running
async function checkDesktopAppConnection() {
  try {
    const response = await fetch('http://127.0.0.1:45782', {
      method: 'GET',
      signal: AbortSignal.timeout(1000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Store job locally in extension storage (fallback)
function storeJobLocally(job) {
  chrome.storage.local.get(['pendingJobs'], (result) => {
    const pendingJobs = result.pendingJobs || [];
    pendingJobs.push({
      ...job,
      capturedAt: new Date().toISOString()
    });
    
    // Keep only last 100 jobs
    if (pendingJobs.length > 100) {
      pendingJobs.shift();
    }
    
    chrome.storage.local.set({ pendingJobs });
  });
}

// Show badge when jobs are captured
chrome.storage.local.get(['pendingJobs'], (result) => {
  const count = (result.pendingJobs || []).length;
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
  }
});
