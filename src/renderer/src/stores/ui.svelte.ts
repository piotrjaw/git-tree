let selectedRepoPath = $state<string | null>(null)
let expandedNodes = $state<Set<string>>(new Set())
let showSettings = $state(false)

export function getSelectedRepoPath(): string | null {
  return selectedRepoPath
}

export function setSelectedRepoPath(path: string | null): void {
  selectedRepoPath = path
}

export function isExpanded(nodeId: string): boolean {
  return expandedNodes.has(nodeId)
}

export function toggleExpanded(nodeId: string): void {
  const next = new Set(expandedNodes)
  if (next.has(nodeId)) {
    next.delete(nodeId)
  } else {
    next.add(nodeId)
  }
  expandedNodes = next
}

export function collapseAll(): void {
  expandedNodes = new Set()
}

export function getShowSettings(): boolean {
  return showSettings
}

export function setShowSettings(value: boolean): void {
  showSettings = value
}
