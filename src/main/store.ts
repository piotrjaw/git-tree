import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { AppSettings } from '@shared/types'

interface StoreData {
  watchedFolders: string[]
  refreshIntervalMs: number
  maxScanDepth: number
  ignorePatterns: string[]
  windowBounds: { x?: number; y?: number; width: number; height: number }
}

const defaults: StoreData = {
  watchedFolders: [],
  refreshIntervalMs: 30000,
  maxScanDepth: 5,
  ignorePatterns: [],
  windowBounds: { width: 1200, height: 800 }
}

let data: StoreData | null = null
let storePath = ''

function getStorePath(): string {
  if (!storePath) {
    const userDataPath = app.getPath('userData')
    mkdirSync(userDataPath, { recursive: true })
    storePath = join(userDataPath, 'config.json')
  }
  return storePath
}

function ensureLoaded(): StoreData {
  if (data) return data
  try {
    const raw = readFileSync(getStorePath(), 'utf-8')
    data = { ...defaults, ...JSON.parse(raw) }
  } catch {
    data = { ...defaults }
  }
  return data
}

function save(): void {
  try {
    writeFileSync(getStorePath(), JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save config:', err)
  }
}

export function getSettings(): AppSettings {
  const d = ensureLoaded()
  return {
    watchedFolders: d.watchedFolders,
    refreshIntervalMs: d.refreshIntervalMs,
    maxScanDepth: d.maxScanDepth,
    ignorePatterns: d.ignorePatterns
  }
}

export function setSettings(settings: Partial<AppSettings>): void {
  const d = ensureLoaded()
  if (settings.watchedFolders !== undefined) d.watchedFolders = settings.watchedFolders
  if (settings.refreshIntervalMs !== undefined) d.refreshIntervalMs = settings.refreshIntervalMs
  if (settings.maxScanDepth !== undefined) d.maxScanDepth = settings.maxScanDepth
  if (settings.ignorePatterns !== undefined) d.ignorePatterns = settings.ignorePatterns
  save()
}

export function getWindowBounds(): StoreData['windowBounds'] {
  return ensureLoaded().windowBounds
}

export function setWindowBounds(bounds: StoreData['windowBounds']): void {
  ensureLoaded().windowBounds = bounds
  save()
}
