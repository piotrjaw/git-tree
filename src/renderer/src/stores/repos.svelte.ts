import type { RepoStatus, ScanResult } from '@shared/types'

let repoMap = $state<Map<string, RepoStatus>>(new Map())
let loading = $state(false)
let scanningFolder = $state<string | null>(null)

export function getRepos(): RepoStatus[] {
  return [...repoMap.values()]
}

export function getRepoByPath(path: string): RepoStatus | undefined {
  return repoMap.get(path)
}

export function isLoading(): boolean {
  return loading
}

export function getScanningFolder(): string | null {
  return scanningFolder
}

export async function addFolder(folderPath: string): Promise<ScanResult> {
  scanningFolder = folderPath
  loading = true
  try {
    const result = await window.api.scanFolder(folderPath)
    if (result.repos.length > 0) {
      const statuses = await window.api.getAllStatuses(result.repos)
      for (const status of statuses) {
        repoMap.set(status.path, status)
      }
      repoMap = new Map(repoMap)
      await window.api.startWatching(result.repos)
    }
    return result
  } finally {
    loading = false
    scanningFolder = null
  }
}

export async function refreshRepo(repoPath: string): Promise<void> {
  const status = await window.api.getRepoStatus(repoPath)
  repoMap.set(status.path, status)
  repoMap = new Map(repoMap)
}

export async function refreshAll(): Promise<void> {
  const paths = [...repoMap.keys()]
  if (paths.length === 0) return
  loading = true
  try {
    const statuses = await window.api.getAllStatuses(paths)
    for (const status of statuses) {
      repoMap.set(status.path, status)
    }
    repoMap = new Map(repoMap)
  } finally {
    loading = false
  }
}

export function removeFolder(folderPath: string): void {
  const toRemove: string[] = []
  for (const [path] of repoMap) {
    if (path.startsWith(folderPath)) {
      toRemove.push(path)
    }
  }
  if (toRemove.length > 0) {
    window.api.stopWatching(toRemove)
    for (const path of toRemove) {
      repoMap.delete(path)
    }
    repoMap = new Map(repoMap)
  }
}

export function getRepoCount(): number {
  return repoMap.size
}
