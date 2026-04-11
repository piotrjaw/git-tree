import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import type { ScanResult } from '@shared/types'

const DEFAULT_IGNORE = new Set([
  'node_modules',
  '.Trash',
  'Library',
  '.cache',
  'vendor',
  'dist',
  'build',
  'out',
  '.next',
  '__pycache__'
])

export async function scanForRepos(
  rootPath: string,
  maxDepth: number = 5,
  ignorePatterns: string[] = [],
  onProgress?: (found: number) => void
): Promise<ScanResult> {
  const start = Date.now()
  const repos: string[] = []
  const ignoreSet = new Set([...DEFAULT_IGNORE, ...ignorePatterns])

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return

    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    const hasGit = entries.some((e) => e.isDirectory() && e.name === '.git')
    if (hasGit) {
      repos.push(dir)
      onProgress?.(repos.length)
      return // Don't recurse into submodules
    }

    const subdirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.') && !ignoreSet.has(e.name))

    await Promise.all(subdirs.map((e) => walk(join(dir, e.name), depth + 1)))
  }

  // Check if the root itself is a repo
  try {
    const rootStat = await stat(join(rootPath, '.git'))
    if (rootStat.isDirectory()) {
      repos.push(rootPath)
      onProgress?.(repos.length)
    }
  } catch {
    // Not a repo at root, scan children
    await walk(rootPath, 0)
  }

  // If root wasn't a repo, we already walked
  if (repos.length === 0 || (repos.length === 1 && repos[0] === rootPath)) {
    // If root was the only repo, we're done. Otherwise scan was done in the try/catch above.
    if (repos.length === 0) {
      await walk(rootPath, 0)
    }
  }

  return {
    folder: rootPath,
    repos: repos.sort(),
    duration: Date.now() - start
  }
}
