/**
 * Background Service Worker
 * Handles communication between content scripts and Jobaly web app
 */

let isEnabled = true;
const WEB_APP_URL = 'http://localhost:3000'; // Change to production URL when deployed

// Load settings from storage
chrome.storage.local.get(['enabled'], (result) => {
  isEnabled = result.enabled !== false;
  console.log('📋 Jobaly Extension loaded, auto-capture:', isEnabled ? 'ON' : 'OFF');
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
    
    // Send to web app by posting message to all Jobaly tabs
    sendToWebApp(message.job)
      .then(() => {
        console.log('✅ Sent to Jobaly web app successfully');
        sendResponse({ success: true, method: 'web-app' });
      })
      .catch((error) => {
        console.warn('⚠ Web app not reachable:', error.message);
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

// Send job to web app by posting message to all Jobaly tabs
async function sendToWebApp(job) {
  console.log('🔍 Looking for Jobaly tabs at:', WEB_APP_URL);
  
  // Find all tabs with the web app open
  const tabs = await chrome.tabs.query({ url: `${WEB_APP_URL}/*` });
  
  console.log(`📊 Found ${tabs.length} Jobaly tab(s)`);
  
  if (tabs.length === 0) {
    console.warn('⚠️ No Jobaly tabs found. Make sure http://localhost:3000 is open!');
    throw new Error('No Jobaly tabs open');
  }
  
  // Send message to all web app tabs
  let successCount = 0;
  for (const tab of tabs) {
    if (tab.id) {
      try {
        console.log(`📤 Sending to tab ${tab.id} (${tab.url})`);
        await chrome.tabs.sendMessage(tab.id, {
          type: 'JOB_DETECTED',
          job: job
        });
        console.log(`✅ Sent to Jobaly tab ${tab.id}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to send to tab ${tab.id}:`, error);
      }
    }
  }
  
  if (successCount === 0) {
    throw new Error('Failed to send to any tabs');
  }
  
  return { success: true };
}

// Check if web app is open
async function checkDesktopAppConnection() {
  try {
    const tabs = await chrome.tabs.query({ url: `${WEB_APP_URL}/*` });
    return tabs.length > 0;
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
