import simpleGit, { type StatusResult, type LogResult, type BranchSummary } from 'simple-git'
import type { RepoStatus, FileChange, FileStatus, CommitSummary, BranchInfo } from '@shared/types'
import { basename } from 'path'

function mapFileStatus(index: string, working_dir: string): FileStatus {
  const code = index !== ' ' ? index : working_dir
  switch (code) {
    case 'M':
      return 'modified'
    case 'A':
      return 'added'
    case 'D':
      return 'deleted'
    case 'R':
      return 'renamed'
    case 'C':
      return 'copied'
    case 'U':
      return 'unmerged'
    default:
      return 'modified'
  }
}

export async function getRepoStatus(repoPath: string): Promise<RepoStatus> {
  const git = simpleGit(repoPath)

  try {
    const [status, log, stashList, branchSummary, tagsResult] = await Promise.all([
      git.status(),
      git.log({ maxCount: 10 }).catch(() => null),
      git.stashList().catch(() => null),
      git.branch().catch(() => null),
      git.tag(['--points-at', 'HEAD']).catch(() => '')
    ])

    const branch = buildBranchInfo(status, branchSummary)
    const staged = buildStagedFiles(status)
    const unstaged = buildUnstagedFiles(status)
    const untracked = status.not_added
    const recentCommits = buildCommits(log)
    const stashCount = stashList?.total ?? 0
    const tags = tagsResult
      ? tagsResult
          .split('\n')
          .map((t) => t.trim())
          .filter(Boolean)
      : []

    return {
      path: repoPath,
      name: basename(repoPath),
      branch,
      staged,
      unstaged,
      untracked,
      stashCount,
      recentCommits,
      tags,
      lastRefreshed: Date.now()
    }
  } catch (err) {
    return {
      path: repoPath,
      name: basename(repoPath),
      branch: { current: 'unknown', tracking: null, ahead: 0, behind: 0, detached: false },
      staged: [],
      unstaged: [],
      untracked: [],
      stashCount: 0,
      recentCommits: [],
      tags: [],
      lastRefreshed: Date.now(),
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

function buildBranchInfo(status: StatusResult, branchSummary: BranchSummary | null): BranchInfo {
  return {
    current: status.current ?? 'HEAD',
    tracking: status.tracking ?? null,
    ahead: status.ahead,
    behind: status.behind,
    detached: branchSummary?.detached ?? false
  }
}

function buildStagedFiles(status: StatusResult): FileChange[] {
  const files: FileChange[] = []
  for (const f of status.files) {
    if (f.index && f.index !== ' ' && f.index !== '?') {
      files.push({
        path: f.path,
        status: mapFileStatus(f.index, f.working_dir),
        from: f.from ?? undefined
      })
    }
  }
  return files
}

function buildUnstagedFiles(status: StatusResult): FileChange[] {
  const files: FileChange[] = []
  for (const f of status.files) {
    if (f.working_dir && f.working_dir !== ' ' && f.working_dir !== '?') {
      files.push({
        path: f.path,
        status: mapFileStatus(' ', f.working_dir),
        from: f.from ?? undefined
      })
    }
  }
  return files
}

function buildCommits(log: LogResult | null): CommitSummary[] {
  if (!log) return []
  return log.all.map((entry) => ({
    hash: entry.hash.slice(0, 7),
    hashFull: entry.hash,
    message: entry.message,
    author: entry.author_name,
    authorEmail: entry.author_email,
    date: entry.date,
    refs: entry.refs
  }))
}
