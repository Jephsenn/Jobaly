/**
 * Jobaly Web App Content Script
 * This script runs on the Jobaly web app page and relays messages from the extension background script
 */

console.log('🔌 Jobaly content script loaded');

// Listen for messages from extension background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Message received from extension background:', message.type);
  
  if (message.type === 'JOB_DETECTED') {
    // Forward the message to the web app via window.postMessage
    window.postMessage({
      type: 'JOBALY_JOB_DETECTED',
      job: message.job
    }, '*');
    
    console.log('✅ Job forwarded to web app');
    sendResponse({ success: true });
  }
  
  return true;
});

console.log('👂 Listening for job detection messages from extension');
