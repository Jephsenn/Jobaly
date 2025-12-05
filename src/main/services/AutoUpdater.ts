import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import { logger } from '../utils/logger';

export class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    
    // Configure auto-updater
    autoUpdater.logger = logger;
    autoUpdater.autoDownload = false; // Don't auto-download, ask user first
    autoUpdater.autoInstallOnAppQuit = true;
  }

  setupListeners() {
    // Check for updates on startup (after 3 seconds)
    setTimeout(() => {
      this.checkForUpdates();
    }, 3000);

    // Update available
    autoUpdater.on('update-available', (info) => {
      logger.info('Update available:', info);
      
      if (this.mainWindow) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'Update Available',
          message: `A new version (${info.version}) is available!`,
          detail: 'Would you like to download it now? The update will be installed when you close the app.',
          buttons: ['Download', 'Later'],
          defaultId: 0,
          cancelId: 1
        }).then((result) => {
          if (result.response === 0) {
            autoUpdater.downloadUpdate();
            
            if (this.mainWindow) {
              this.mainWindow.webContents.send('update-downloading');
            }
          }
        });
      }
    });

    // Update not available
    autoUpdater.on('update-not-available', (info) => {
      logger.info('Update not available:', info);
    });

    // Error checking for updates
    autoUpdater.on('error', (err) => {
      logger.error('Error checking for updates:', err);
    });

    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      let logMessage = `Download speed: ${progressObj.bytesPerSecond}`;
      logMessage += ` - Downloaded ${progressObj.percent}%`;
      logMessage += ` (${progressObj.transferred}/${progressObj.total})`;
      
      logger.info(logMessage);
      
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-progress', progressObj);
      }
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      logger.info('Update downloaded:', info);
      
      if (this.mainWindow) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'Update Ready',
          message: 'Update downloaded successfully!',
          detail: 'The update will be installed when you close the app. Would you like to restart now?',
          buttons: ['Restart Now', 'Later'],
          defaultId: 0,
          cancelId: 1
        }).then((result) => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall();
          }
        });
      }
    });
  }

  checkForUpdates() {
    if (process.env.NODE_ENV === 'development') {
      logger.info('Skipping update check in development mode');
      return;
    }

    logger.info('Checking for updates...');
    autoUpdater.checkForUpdates().catch((err) => {
      logger.error('Failed to check for updates:', err);
    });
  }

  // Manual check (can be triggered from menu)
  manualCheckForUpdates() {
    logger.info('Manual update check triggered');
    autoUpdater.checkForUpdates().then((result) => {
      if (result && this.mainWindow) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'Checking for Updates',
          message: 'Checking for updates...',
          buttons: ['OK']
        });
      }
    }).catch((err) => {
      logger.error('Failed to check for updates:', err);
      if (this.mainWindow) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'error',
          title: 'Update Check Failed',
          message: 'Failed to check for updates',
          detail: err.message,
          buttons: ['OK']
        });
      }
    });
  }
}
