import { contextBridge, ipcRenderer } from 'electron'
import type { GitTreeAPI } from '@shared/types'

const api: GitTreeAPI = {
  scanFolder: (folderPath) => ipcRenderer.invoke('git:scan-folder', folderPath),
  getRepoStatus: (repoPath) => ipcRenderer.invoke('git:get-repo-status', repoPath),
  getAllStatuses: (repoPaths) => ipcRenderer.invoke('git:get-all-statuses', repoPaths),
  pickFolder: () => ipcRenderer.invoke('dialog:pick-folder'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings) => ipcRenderer.invoke('settings:set', settings),
  startWatching: (repoPaths) => ipcRenderer.invoke('watcher:start', repoPaths),
  stopWatching: (repoPaths) => ipcRenderer.invoke('watcher:stop', repoPaths),

  onRepoChanged: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, repoPath: string): void => {
      callback(repoPath)
    }
    ipcRenderer.on('repo:changed', handler)
    return () => ipcRenderer.removeListener('repo:changed', handler)
  },

  onScanProgress: (callback) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { folder: string; found: number }
    ): void => {
      callback(data)
    }
    ipcRenderer.on('scan:progress', handler)
    return () => ipcRenderer.removeListener('scan:progress', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}
