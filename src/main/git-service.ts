import simpleGit, { type StatusResult, type LogResult, type BranchSummary } from 'simple-git'
import type {
  RepoStatus,
  FileChange,
  FileStatus,
  CommitSummary,
  BranchInfo,
  GraphCommit,
  GraphData,
  GraphLayoutNode,
  CommitDetail,
  CommitFile
} from '@shared/types'
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

// --- Commit Graph ---

const BRANCH_COLORS = [
  '#58a6ff', // blue
  '#3fb950', // green
  '#d29922', // yellow
  '#f85149', // red
  '#bc8cff', // purple
  '#79c0ff', // light blue
  '#f0883e', // orange
  '#db61a2', // pink
  '#7ee787', // light green
  '#e3b341' // gold
]

export async function getCommitGraph(repoPath: string): Promise<GraphData> {
  const git = simpleGit(repoPath)

  // Get all commits with parents and refs, topo-order for correct graph layout
  const raw = await git.raw([
    'log',
    '--all',
    '--topo-order',
    '--format=%H|%P|%D|%s|%an|%ae|%aI'
  ])

  const lines = raw.trim().split('\n').filter(Boolean)
  const commits: GraphCommit[] = lines.map((line) => {
    const [hash, parentsStr, refsStr, message, author, authorEmail, date] = line.split('|')
    return {
      hash,
      hashShort: hash.slice(0, 7),
      parents: parentsStr ? parentsStr.split(' ').filter(Boolean) : [],
      message: message || '',
      author: author || '',
      authorEmail: authorEmail || '',
      date: date || '',
      refs: refsStr
        ? refsStr.split(',').map((r) => r.trim()).filter(Boolean)
        : []
    }
  })

  const graph = layoutGraph(commits)

  // Check for uncommitted changes
  const status = await git.status()
  const staged = status.staged.length
  const modified = status.modified.length + status.deleted.length + status.renamed.length
  const untracked = status.not_added.length

  if (staged > 0 || modified > 0 || untracked > 0) {
    // Find the HEAD commit node to attach WIP to
    const headNode = graph.nodes.find((n) =>
      n.commit.refs.some((r) => r.startsWith('HEAD'))
    )
    graph.wip = {
      staged,
      modified,
      untracked,
      headHash: headNode?.commit.hash ?? '',
      headColumn: headNode?.column ?? 0,
      headColor: headNode?.color ?? BRANCH_COLORS[0]
    }
  }

  return graph
}

export async function getCommitDetail(
  repoPath: string,
  hash: string
): Promise<CommitDetail> {
  const git = simpleGit(repoPath)

  // Get commit metadata
  const raw = await git.raw(['show', '--format=%H|%s|%b|%an|%ae|%aI', '--no-patch', hash])
  const parts = raw.trim().split('|')
  const [, subject, body, author, authorEmail, date] = parts

  // Get changed files with stats
  const diffRaw = await git.raw([
    'diff-tree',
    '--no-commit-id',
    '-r',
    '--numstat',
    '--diff-filter=ACDMRT',
    '-z',
    hash
  ])

  const files: CommitFile[] = []
  // --numstat with -z: fields are separated by \t and \0
  // Format: additions\tdeletions\tpath\0 (or for renames: additions\tdeletions\t\0oldpath\0newpath\0)
  const entries = diffRaw.split('\0').filter(Boolean)
  for (const entry of entries) {
    const match = entry.match(/^(\d+|-)\t(\d+|-)\t(.+)/)
    if (match) {
      files.push({
        path: match[3],
        status: 'modified',
        additions: match[1] === '-' ? 0 : parseInt(match[1]),
        deletions: match[2] === '-' ? 0 : parseInt(match[2])
      })
    }
  }

  // Get file statuses (A/M/D/R)
  const statusRaw = await git.raw([
    'diff-tree',
    '--no-commit-id',
    '-r',
    '--name-status',
    hash
  ])
  const statusLines = statusRaw.trim().split('\n').filter(Boolean)
  const statusMap = new Map<string, string>()
  for (const line of statusLines) {
    const [status, ...pathParts] = line.split('\t')
    const filePath = pathParts[pathParts.length - 1]
    const statusChar = status.charAt(0)
    const labels: Record<string, string> = {
      A: 'added',
      M: 'modified',
      D: 'deleted',
      R: 'renamed',
      C: 'copied',
      T: 'type-change'
    }
    statusMap.set(filePath, labels[statusChar] || 'modified')
  }

  for (const f of files) {
    f.status = statusMap.get(f.path) || f.status
  }

  return {
    hash,
    message: subject || '',
    body: body || '',
    author: author || '',
    authorEmail: authorEmail || '',
    date: date || '',
    files
  }
}

export async function getWipDetail(repoPath: string): Promise<CommitDetail> {
  const git = simpleGit(repoPath)
  const status = await git.status()

  const files: CommitFile[] = []

  for (const f of status.files) {
    const isStaged = f.index && f.index !== ' ' && f.index !== '?'
    const isUnstaged = f.working_dir && f.working_dir !== ' '
    const isUntracked = f.working_dir === '?'

    const statusLabel = isUntracked
      ? 'untracked'
      : isStaged && isUnstaged
        ? 'modified (partially staged)'
        : isStaged
          ? 'staged'
          : 'modified'

    files.push({
      path: f.path,
      status: statusLabel,
      additions: 0,
      deletions: 0
    })
  }

  return {
    hash: 'wip',
    message: 'Uncommitted changes',
    body: '',
    author: '',
    authorEmail: '',
    date: new Date().toISOString(),
    files
  }
}

export async function checkoutBranch(
  repoPath: string,
  branch: string
): Promise<{ success: boolean; error?: string }> {
  const git = simpleGit(repoPath)
  try {
    await git.checkout(branch)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function layoutGraph(commits: GraphCommit[]): GraphData {
  const nodes: GraphLayoutNode[] = []
  let lanes: (string | null)[] = []
  const branchColors: Record<string, string> = {}
  let colorIndex = 0

  const hashToRow = new Map<string, number>()
  for (let i = 0; i < commits.length; i++) {
    hashToRow.set(commits[i].hash, i)
  }

  const hashToColor = new Map<string, string>()

  function nextColor(): string {
    const c = BRANCH_COLORS[colorIndex % BRANCH_COLORS.length]
    colorIndex++
    return c
  }

  function findFreeLane(): number {
    const idx = lanes.indexOf(null)
    if (idx !== -1) return idx
    lanes.push(null)
    return lanes.length - 1
  }

  for (let row = 0; row < commits.length; row++) {
    const commit = commits[row]

    // Find which lane this commit occupies
    let col = lanes.indexOf(commit.hash)
    if (col === -1) {
      col = findFreeLane()
    }

    // Consume: clear this commit from its lane
    lanes[col] = null

    // Assign color
    let color = hashToColor.get(commit.hash)
    if (!color) {
      color = nextColor()
      hashToColor.set(commit.hash, color)
    }

    for (const ref of commit.refs) {
      if (!branchColors[ref]) branchColors[ref] = color
    }

    const isMerge = commit.parents.length > 1
    const isBranchTip = commit.refs.some(
      (r) => r.startsWith('HEAD') || (!r.startsWith('tag:') && !r.includes('->'))
    )

    const parentLinks: GraphLayoutNode['parentLinks'] = []

    for (let p = 0; p < commit.parents.length; p++) {
      const parentHash = commit.parents[p]
      const parentRow = hashToRow.get(parentHash)

      // Check if this parent is already reserved in some lane
      let parentLane = lanes.indexOf(parentHash)

      if (parentLane !== -1) {
        // Parent already claimed by another child — link to that lane (fork)
      } else {
        // Parent not yet in any lane — assign one
        if (p === 0 && lanes[col] === null) {
          // First parent inherits this commit's column
          parentLane = col
        } else {
          parentLane = findFreeLane()
        }
        lanes[parentLane] = parentHash

        if (!hashToColor.has(parentHash)) {
          hashToColor.set(parentHash, p === 0 ? color : nextColor())
        }
      }

      const linkColor = p === 0 ? color : (hashToColor.get(parentHash) || color)

      if (parentRow !== undefined) {
        parentLinks.push({
          fromCol: col,
          fromRow: row,
          toCol: parentLane,
          toRow: parentRow,
          color: linkColor
        })
      }
    }

    if (commit.parents.length === 0) {
      // Root commit — lane stays free (already cleared above)
    }

    // Collapse trailing empty lanes
    while (lanes.length > 0 && lanes[lanes.length - 1] === null) {
      lanes.pop()
    }

    nodes.push({
      commit,
      column: col,
      row,
      parentLinks,
      color,
      isMerge,
      isBranchTip
    })
  }

  const totalColumns = Math.max(1, ...nodes.map((n) => n.column + 1))

  return { nodes, totalColumns, branchColors }
}
