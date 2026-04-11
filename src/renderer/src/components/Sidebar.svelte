<script lang="ts">
  import RepoNode from './RepoNode.svelte'
  import {
    getRepos,
    addFolder,
    isLoading,
    refreshAll
  } from '../stores/repos.svelte'
  import {
    getSettings,
    addWatchedFolder,
    loadSettings
  } from '../stores/settings.svelte'
  import { collapseAll, getShowSettings, setShowSettings } from '../stores/ui.svelte'

  let scanning = $state(false)

  async function handleAddFolder() {
    const folderPath = await window.api.pickFolder()
    if (!folderPath) return

    scanning = true
    try {
      await addWatchedFolder(folderPath)
      await addFolder(folderPath)
    } finally {
      scanning = false
    }
  }

  async function handleRefresh() {
    await refreshAll()
  }

  let repos = $derived(getRepos())
  let loading = $derived(isLoading())

  // Group repos by their watched folder parent
  let groupedRepos = $derived.by(() => {
    const folders = getSettings().watchedFolders
    const groups = new Map<string, typeof repos>()

    for (const folder of folders) {
      groups.set(folder, [])
    }

    for (const repo of repos) {
      let matched = false
      for (const folder of folders) {
        if (repo.path.startsWith(folder)) {
          groups.get(folder)!.push(repo)
          matched = true
          break
        }
      }
      if (!matched) {
        // Orphan repo - put under its own path
        if (!groups.has(repo.path)) groups.set(repo.path, [])
        groups.get(repo.path)!.push(repo)
      }
    }

    return groups
  })

  function shortenPath(path: string): string {
    return path.replace(/^\/Users\/[^/]+/, '~')
  }
</script>

<div class="sidebar">
  <div class="toolbar">
    <button class="btn" onclick={handleAddFolder} disabled={scanning}>
      {scanning ? 'Scanning...' : '+ Add Folder'}
    </button>
    <button class="btn-icon" onclick={handleRefresh} disabled={loading} title="Refresh all">
      {loading ? '\u23F3' : '\u21BB'}
    </button>
    <button class="btn-icon" onclick={() => collapseAll()} title="Collapse all">
      \u2BC8
    </button>
    <button
      class="btn-icon"
      class:active={getShowSettings()}
      onclick={() => setShowSettings(!getShowSettings())}
      title="Settings"
    >
      \u2699
    </button>
  </div>

  <div class="tree-container" role="tree">
    {#if repos.length === 0 && !scanning}
      <div class="empty">
        <p>No repositories yet</p>
        <p class="hint">Click "Add Folder" to scan a directory for git repos</p>
      </div>
    {:else}
      {#each [...groupedRepos.entries()] as [folder, folderRepos]}
        <div class="folder-group">
          <div class="folder-label" title={folder}>{shortenPath(folder)}</div>
          {#each folderRepos as repo (repo.path)}
            <RepoNode {repo} depth={1} />
          {/each}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .toolbar {
    display: flex;
    gap: 4px;
    padding: 8px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .btn {
    flex: 1;
    padding: 6px 12px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface-raised);
    color: var(--color-text);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn:hover:not(:disabled) {
    background: var(--color-hover);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface-raised);
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 16px;
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .btn-icon:hover:not(:disabled) {
    background: var(--color-hover);
    color: var(--color-text);
  }

  .btn-icon:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-icon.active {
    background: var(--color-accent);
    color: white;
    border-color: var(--color-accent);
  }

  .tree-container {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: var(--color-text-muted);
    text-align: center;
    padding: 16px;
  }

  .empty p {
    margin: 0;
    font-size: 13px;
  }

  .empty .hint {
    font-size: 11px;
    margin-top: 4px;
    opacity: 0.7;
  }

  .folder-group {
    margin-bottom: 4px;
  }

  .folder-label {
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
