#!/usr/bin/env node

/**
 * Native Messaging Host
 * Bridge between Chrome Extension and Electron Desktop App
 * 
 * This script runs as a separate process and communicates with:
 * - Chrome Extension (via stdin/stdout)
 * - Electron Desktop App (via HTTP/WebSocket)
 */

const net = require('net');
const fs = require('fs');
const path = require('path');

// Configuration
const DESKTOP_APP_PORT = 45782; // Port where Electron app listens
const LOG_FILE = path.join(process.env.TEMP || '/tmp', 'job-search-native-host.log');

// Logging
function log(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
}

log('Native messaging host started');

// Read message from Chrome Extension
function readMessage() {
  return new Promise((resolve, reject) => {
    const lengthBuffer = Buffer.alloc(4);
    process.stdin.read(4, (err, bytes) => {
      if (err || !bytes) {
        reject(err || new Error('Failed to read length'));
        return;
      }
      
      lengthBuffer.set(bytes);
      const messageLength = lengthBuffer.readUInt32LE(0);
      
      const messageBuffer = Buffer.alloc(messageLength);
      process.stdin.read(messageLength, (err, bytes) => {
        if (err || !bytes) {
          reject(err || new Error('Failed to read message'));
          return;
        }
        
        messageBuffer.set(bytes);
        const message = JSON.parse(messageBuffer.toString('utf8'));
        resolve(message);
      });
    });
  });
}

// Send message to Chrome Extension
function sendMessage(message) {
  const messageString = JSON.stringify(message);
  const messageBuffer = Buffer.from(messageString, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(messageBuffer.length, 0);
  
  process.stdout.write(lengthBuffer);
  process.stdout.write(messageBuffer);
  log(`Sent to extension: ${messageString}`);
}

// Forward message to Desktop App via TCP
function sendToDesktopApp(message) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    
    client.connect(DESKTOP_APP_PORT, '127.0.0.1', () => {
      log('Connected to desktop app');
      client.write(JSON.stringify(message) + '\n');
    });
    
    client.on('data', (data) => {
      const response = JSON.parse(data.toString());
      log(`Response from desktop app: ${JSON.stringify(response)}`);
      client.destroy();
      resolve(response);
    });
    
    client.on('error', (err) => {
      log(`Desktop app connection error: ${err.message}`);
      reject(err);
    });
    
    client.on('close', () => {
      log('Desktop app connection closed');
    });
  });
}

// Main message loop
async function messageLoop() {
  while (true) {
    try {
      const message = await readMessage();
      log(`Received from extension: ${JSON.stringify(message)}`);
      
      if (message.type === 'JOB_DETECTED') {
        // Forward job to desktop app
        try {
          const response = await sendToDesktopApp(message);
          sendMessage({ success: true, response });
        } catch (error) {
          log(`Failed to forward to desktop app: ${error.message}`);
          sendMessage({ success: false, error: error.message });
        }
      } else {
        sendMessage({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      log(`Message loop error: ${error.message}`);
      break;
    }
  }
}

// Handle errors
process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`);
  process.exit(1);
});

// Start
messageLoop().catch((err) => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
