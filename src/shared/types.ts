export interface RepoStatus {
  path: string
  name: string
  branch: BranchInfo
  staged: FileChange[]
  unstaged: FileChange[]
  untracked: string[]
  stashCount: number
  recentCommits: CommitSummary[]
  tags: string[]
  lastRefreshed: number
  error?: string
}

export interface BranchInfo {
  current: string
  tracking: string | null
  ahead: number
  behind: number
  detached: boolean
}

export interface FileChange {
  path: string
  status: FileStatus
  from?: string
}

export type FileStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'unmerged'

export interface CommitSummary {
  hash: string
  hashFull: string
  message: string
  author: string
  authorEmail: string
  date: string
  refs: string
}

export interface TreeNodeData {
  id: string
  label: string
  icon?: string
  badge?: string | number
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  children?: TreeNodeData[]
  expanded?: boolean
  selectable?: boolean
  data?: Record<string, unknown>
}

export interface AppSettings {
  watchedFolders: string[]
  refreshIntervalMs: number
  maxScanDepth: number
  ignorePatterns: string[]
}

export interface ScanResult {
  folder: string
  repos: string[]
  duration: number
}

export interface GitTreeAPI {
  scanFolder(folderPath: string): Promise<ScanResult>
  getRepoStatus(repoPath: string): Promise<RepoStatus>
  getAllStatuses(repoPaths: string[]): Promise<RepoStatus[]>
  pickFolder(): Promise<string | null>
  getSettings(): Promise<AppSettings>
  setSettings(settings: Partial<AppSettings>): Promise<void>
  startWatching(repoPaths: string[]): Promise<void>
  stopWatching(repoPaths: string[]): Promise<void>
  onRepoChanged(callback: (repoPath: string) => void): () => void
  onScanProgress(callback: (data: { folder: string; found: number }) => void): () => void
}
