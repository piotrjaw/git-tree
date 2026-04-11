import type { AppSettings } from '@shared/types'

let settings = $state<AppSettings>({
  watchedFolders: [],
  refreshIntervalMs: 30000,
  maxScanDepth: 5,
  ignorePatterns: []
})

export function getSettings(): AppSettings {
  return settings
}

export async function loadSettings(): Promise<void> {
  settings = await window.api.getSettings()
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<void> {
  await window.api.setSettings(partial)
  settings = { ...settings, ...partial }
}

export async function addWatchedFolder(folder: string): Promise<void> {
  if (settings.watchedFolders.includes(folder)) return
  const updated = [...settings.watchedFolders, folder]
  await updateSettings({ watchedFolders: updated })
}

export async function removeWatchedFolder(folder: string): Promise<void> {
  const updated = settings.watchedFolders.filter((f) => f !== folder)
  await updateSettings({ watchedFolders: updated })
}
