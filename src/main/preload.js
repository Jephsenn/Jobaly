const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // System info
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // Job operations
  jobs: {
    getAll: () => ipcRenderer.invoke('get-jobs'),
    getById: (id) => ipcRenderer.invoke('get-job', id),
    updateStatus: (id, status) => ipcRenderer.invoke('update-job-status', id, status),
    markApplied: (id) => ipcRenderer.invoke('mark-job-applied', id),
    delete: (id) => ipcRenderer.invoke('delete-job', id),
    onJobAdded: (callback) => {
      ipcRenderer.on('job-added', (_, job) => callback(job));
    },
  },

  // Resume operations
  resumes: {
    getAll: () => ipcRenderer.invoke('get-resumes'),
    save: (resumeData) => ipcRenderer.invoke('save-resume', resumeData),
    setPrimary: (id) => ipcRenderer.invoke('set-primary-resume', id),
    delete: (id) => ipcRenderer.invoke('delete-resume', id),
  },

  // Match operations
  matches: {
    getJobMatches: () => ipcRenderer.invoke('get-job-matches'),
  },

  // Application operations
  applications: {
    getAll: () => ipcRenderer.invoke('get-all-applications'),
    getMaterials: (jobId) => ipcRenderer.invoke('get-application-materials', jobId),
    updateStatus: (id, status) => ipcRenderer.invoke('update-application-status', id, status),
    addNote: (id, note) => ipcRenderer.invoke('add-application-note', id, note),
    downloadResume: (jobId) => ipcRenderer.invoke('download-resume', jobId),
    downloadCoverLetter: (jobId) => ipcRenderer.invoke('download-cover-letter', jobId),
    regenerateMaterials: (jobId) => ipcRenderer.invoke('regenerate-materials', jobId),
  },

  // Settings operations
  settings: {
    save: (settings) => ipcRenderer.invoke('save-user-settings', settings),
    get: () => ipcRenderer.invoke('get-user-settings'),
  },
});
