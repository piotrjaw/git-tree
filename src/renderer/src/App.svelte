<script lang="ts">
  import type { CommitDetail, FileDiff } from '@shared/types'
  import Sidebar from './components/Sidebar.svelte'
  import CommitGraph from './components/CommitGraph.svelte'
  import CommitDetailPanel from './components/CommitDetailPanel.svelte'
  import FileDiffViewer from './components/FileDiffViewer.svelte'
  import SettingsPanel from './components/SettingsPanel.svelte'
  import StatusBar from './components/StatusBar.svelte'
  import { getShowSettings, getSelectedRepoPath, triggerRefresh } from './stores/ui.svelte'
  import { refreshRepo, refreshAll, addFolder } from './stores/repos.svelte'
  import { loadSettings, getSettings, addWatchedFolder } from './stores/settings.svelte'

  let sidebarWidth = $state(280)
  let detailWidth = $state(350)
  let resizing = $state(false)
  let resizingDetail = $state(false)
  let selectedCommitHash = $state<string | null>(null)
  let commitDetail = $state<CommitDetail | null>(null)
  let detailLoading = $state(false)
  let selectedFilePath = $state<string | null>(null)
  let fileDiff = $state<FileDiff | null>(null)
  let diffLoading = $state(false)

  let showSettings = $derived(getShowSettings())
  let showDetail = $derived(selectedCommitHash !== null)
  let showDiff = $derived(selectedFilePath !== null)

  // Clear all detail state when selected repo changes
  let currentRepoPath = $derived(getSelectedRepoPath())
  $effect(() => {
    currentRepoPath // track dependency
    selectedCommitHash = null
    commitDetail = null
    selectedFilePath = null
    fileDiff = null
  })

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
      triggerRefresh()
    }, settings.refreshIntervalMs)

    const unsubscribe = window.api.onRepoChanged((repoPath) => {
      refreshRepo(repoPath)
      triggerRefresh()
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
    selectedFilePath = null
    fileDiff = null

    const repoPath = getSelectedRepoPath()
    if (!repoPath) return

    try {
      if (hash === 'wip') {
        commitDetail = await window.api.getWipDetail(repoPath)
      } else {
        commitDetail = await window.api.getCommitDetail(repoPath, hash)
      }
    } catch (err) {
      console.error('Failed to load commit detail:', err)
    } finally {
      detailLoading = false
    }
  }

  async function handleSelectFile(filePath: string) {
    if (selectedFilePath === filePath) {
      selectedFilePath = null
      fileDiff = null
      return
    }

    selectedFilePath = filePath
    fileDiff = null
    diffLoading = true

    const repoPath = getSelectedRepoPath()
    if (!repoPath || !selectedCommitHash) return

    try {
      fileDiff = await window.api.getFileDiff(repoPath, selectedCommitHash, filePath)
    } catch (err) {
      console.error('Failed to load file diff:', err)
    } finally {
      diffLoading = false
    }
  }

  function handleCloseDiff() {
    selectedFilePath = null
    fileDiff = null
  }

  function handleCloseDetail() {
    selectedFilePath = null
    fileDiff = null
    selectedCommitHash = null
    commitDetail = null
  }

  async function handleCheckoutBranch(branch: string) {
    const repoPath = getSelectedRepoPath()
    if (!repoPath) return

    const result = await window.api.checkoutBranch(repoPath, branch)
    if (result.success) {
      // Refresh repo status in sidebar and reload graph
      await refreshRepo(repoPath)
      triggerRefresh()
    } else {
      console.error('Checkout failed:', result.error)
    }
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
      if (selectedFilePath) {
        handleCloseDiff()
      } else if (selectedCommitHash) {
        handleCloseDetail()
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

  // Resizable detail panel (dragged from the left edge)
  function startDetailResize(e: MouseEvent) {
    e.preventDefault()
    resizingDetail = true

    const onMouseMove = (e: MouseEvent) => {
      detailWidth = Math.max(250, Math.min(600, window.innerWidth - e.clientX))
    }

    const onMouseUp = () => {
      resizingDetail = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="app" class:resizing class:resizingDetail>
  <div class="sidebar-wrapper" style="width: {sidebarWidth}px">
    {#if showSettings}
      <SettingsPanel />
    {/if}
    <Sidebar />
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="resize-handle" onmousedown={startResize}></div>

  <main class="main-content">
    <CommitGraph onSelectCommit={handleSelectCommit} onCheckoutBranch={handleCheckoutBranch} {selectedCommitHash} />

    {#if showDiff}
      <FileDiffViewer diff={fileDiff} loading={diffLoading} onclose={handleCloseDiff} />
    {/if}
  </main>

  {#if showDetail}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="detail-resize-handle" onmousedown={startDetailResize}></div>
    <aside class="detail-wrapper" style="width: {detailWidth}px">
      <CommitDetailPanel detail={commitDetail} loading={detailLoading} onclose={handleCloseDetail} onSelectFile={handleSelectFile} {selectedFilePath} />
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
    grid-template-columns: auto 4px 1fr 4px auto;
  }

  .app.resizing,
  .app.resizingDetail {
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
    position: relative;
  }

  .detail-resize-handle {
    grid-row: 1;
    grid-column: 4;
    cursor: col-resize;
    background: transparent;
    transition: background 0.15s;
  }

  .detail-resize-handle:hover,
  .resizingDetail .detail-resize-handle {
    background: var(--color-accent);
  }

  .detail-wrapper {
    grid-row: 1;
    grid-column: 5;
    overflow: hidden;
    min-width: 250px;
    max-width: 600px;
  }

  :global(.status-bar) {
    grid-row: 2;
    grid-column: 1 / -1;
  }
</style>
