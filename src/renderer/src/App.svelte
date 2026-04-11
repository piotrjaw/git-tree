<script lang="ts">
  import type { CommitDetail } from '@shared/types'
  import Sidebar from './components/Sidebar.svelte'
  import CommitGraph from './components/CommitGraph.svelte'
  import CommitDetailPanel from './components/CommitDetailPanel.svelte'
  import SettingsPanel from './components/SettingsPanel.svelte'
  import StatusBar from './components/StatusBar.svelte'
  import { collapseAll, getShowSettings, getSelectedRepoPath } from './stores/ui.svelte'
  import { refreshRepo, refreshAll, addFolder } from './stores/repos.svelte'
  import { loadSettings, getSettings, addWatchedFolder } from './stores/settings.svelte'

  let sidebarWidth = $state(280)
  let resizing = $state(false)
  let selectedCommitHash = $state<string | null>(null)
  let commitDetail = $state<CommitDetail | null>(null)
  let detailLoading = $state(false)

  let showSettings = $derived(getShowSettings())
  let showDetail = $derived(selectedCommitHash !== null)

  // Initialize on mount
  $effect(() => {
    init()
  })

  async function init() {
    await loadSettings()
    const settings = getSettings()

    for (const folder of settings.watchedFolders) {
      await addFolder(folder)
    }

    const interval = setInterval(() => {
      refreshAll()
    }, settings.refreshIntervalMs)

    const unsubscribe = window.api.onRepoChanged((repoPath) => {
      refreshRepo(repoPath)
    })

    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }

  async function handleSelectCommit(hash: string) {
    if (selectedCommitHash === hash) {
      // Toggle off
      selectedCommitHash = null
      commitDetail = null
      return
    }

    selectedCommitHash = hash
    commitDetail = null
    detailLoading = true

    const repoPath = getSelectedRepoPath()
    if (!repoPath) return

    try {
      commitDetail = await window.api.getCommitDetail(repoPath, hash)
    } catch (err) {
      console.error('Failed to load commit detail:', err)
    } finally {
      detailLoading = false
    }
  }

  function handleCloseDetail() {
    selectedCommitHash = null
    commitDetail = null
  }

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey

    if (mod && e.key === 'r') {
      e.preventDefault()
      refreshAll()
    }
    if (mod && e.key === 'o') {
      e.preventDefault()
      handleAddFolder()
    }
    if (e.key === 'Escape') {
      if (selectedCommitHash) {
        handleCloseDetail()
      } else {
        collapseAll()
      }
    }
  }

  async function handleAddFolder() {
    const folderPath = await window.api.pickFolder()
    if (!folderPath) return
    await addWatchedFolder(folderPath)
    await addFolder(folderPath)
  }

  // Resizable sidebar
  function startResize(e: MouseEvent) {
    e.preventDefault()
    resizing = true

    const onMouseMove = (e: MouseEvent) => {
      sidebarWidth = Math.max(200, Math.min(500, e.clientX))
    }

    const onMouseUp = () => {
      resizing = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="app" class:resizing>
  <div class="sidebar-wrapper" style="width: {sidebarWidth}px">
    {#if showSettings}
      <SettingsPanel />
    {/if}
    <Sidebar />
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="resize-handle" onmousedown={startResize}></div>

  <main class="main-content">
    <CommitGraph onSelectCommit={handleSelectCommit} {selectedCommitHash} />
  </main>

  {#if showDetail}
    <aside class="detail-wrapper">
      <CommitDetailPanel detail={commitDetail} loading={detailLoading} onclose={handleCloseDetail} />
    </aside>
  {/if}

  <StatusBar />
</div>

<style>
  .app {
    display: grid;
    grid-template-columns: auto 4px 1fr;
    grid-template-rows: 1fr auto;
    height: 100vh;
    background: var(--color-bg);
    color: var(--color-text);
  }

  .app:has(.detail-wrapper) {
    grid-template-columns: auto 4px 1fr 350px;
  }

  .app.resizing {
    cursor: col-resize;
    user-select: none;
  }

  .sidebar-wrapper {
    grid-row: 1;
    grid-column: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 200px;
    max-width: 500px;
  }

  .resize-handle {
    grid-row: 1;
    grid-column: 2;
    cursor: col-resize;
    background: transparent;
    transition: background 0.15s;
  }

  .resize-handle:hover,
  .resizing .resize-handle {
    background: var(--color-accent);
  }

  .main-content {
    grid-row: 1;
    grid-column: 3;
    overflow: hidden;
    background: var(--color-bg);
  }

  .detail-wrapper {
    grid-row: 1;
    grid-column: 4;
    overflow: hidden;
  }

  :global(.status-bar) {
    grid-row: 2;
    grid-column: 1 / -1;
  }
</style>
