import { watch, type FSWatcher } from 'chokidar'
import { join } from 'path'
import type { BrowserWindow } from 'electron'

const watchers = new Map<string, FSWatcher>()
const debounceTimers = new Map<string, NodeJS.Timeout>()

export function startWatching(repoPaths: string[], window: BrowserWindow): void {
  for (const repoPath of repoPaths) {
    if (watchers.has(repoPath)) continue

    const gitDir = join(repoPath, '.git')
    const watcher = watch(
      [
        join(gitDir, 'HEAD'),
        join(gitDir, 'index'),
        join(gitDir, 'refs'),
        join(gitDir, 'stash')
      ],
      {
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 200 }
      }
    )

    watcher.on('all', () => {
      const existing = debounceTimers.get(repoPath)
      if (existing) clearTimeout(existing)

      debounceTimers.set(
        repoPath,
        setTimeout(() => {
          debounceTimers.delete(repoPath)
          if (!window.isDestroyed()) {
            window.webContents.send('repo:changed', repoPath)
          }
        }, 500)
      )
    })

    watchers.set(repoPath, watcher)
  }
}

export function stopWatching(repoPaths: string[]): void {
  for (const repoPath of repoPaths) {
    const watcher = watchers.get(repoPath)
    if (watcher) {
      watcher.close()
      watchers.delete(repoPath)
    }
    const timer = debounceTimers.get(repoPath)
    if (timer) {
      clearTimeout(timer)
      debounceTimers.delete(repoPath)
    }
  }
}

export function stopAll(): void {
  for (const [, watcher] of watchers) {
    watcher.close()
  }
  watchers.clear()
  for (const [, timer] of debounceTimers) {
    clearTimeout(timer)
  }
  debounceTimers.clear()
}
