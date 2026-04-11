import { ipcMain, dialog, type BrowserWindow } from 'electron'
import { getRepoStatus, getCommitGraph, getCommitDetail } from './git-service'
import { scanForRepos } from './repo-scanner'
import { getSettings, setSettings } from './store'
import { startWatching, stopWatching } from './file-watcher'
import type { AppSettings } from '@shared/types'

export function registerIpcHandlers(window: BrowserWindow): void {
  ipcMain.handle('git:scan-folder', async (_event, folderPath: string) => {
    const settings = getSettings()
    return scanForRepos(folderPath, settings.maxScanDepth, settings.ignorePatterns, (found) => {
      if (!window.isDestroyed()) {
        window.webContents.send('scan:progress', { folder: folderPath, found })
      }
    })
  })

  ipcMain.handle('git:get-repo-status', async (_event, repoPath: string) => {
    return getRepoStatus(repoPath)
  })

  ipcMain.handle('git:get-all-statuses', async (_event, repoPaths: string[]) => {
    return Promise.all(repoPaths.map((p) => getRepoStatus(p)))
  })

  ipcMain.handle('git:get-commit-graph', async (_event, repoPath: string) => {
    return getCommitGraph(repoPath)
  })

  ipcMain.handle('git:get-commit-detail', async (_event, repoPath: string, hash: string) => {
    return getCommitDetail(repoPath, hash)
  })

  ipcMain.handle('dialog:pick-folder', async () => {
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
      title: 'Select a folder to scan for Git repositories'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('settings:get', () => {
    return getSettings()
  })

  ipcMain.handle('settings:set', (_event, settings: Partial<AppSettings>) => {
    setSettings(settings)
  })

  ipcMain.handle('watcher:start', (_event, repoPaths: string[]) => {
    startWatching(repoPaths, window)
  })

  ipcMain.handle('watcher:stop', (_event, repoPaths: string[]) => {
    stopWatching(repoPaths)
  })
}
