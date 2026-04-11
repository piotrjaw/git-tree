<script lang="ts">
  import Sidebar from './components/Sidebar.svelte'
  import DetailPanel from './components/DetailPanel.svelte'
  import SettingsPanel from './components/SettingsPanel.svelte'
  import StatusBar from './components/StatusBar.svelte'
  import { getSelectedRepoPath, collapseAll, getShowSettings } from './stores/ui.svelte'
  import { getRepoByPath, refreshRepo, refreshAll, addFolder } from './stores/repos.svelte'
  import { loadSettings, getSettings, addWatchedFolder } from './stores/settings.svelte'

  let sidebarWidth = $state(280)
  let resizing = $state(false)

  let selectedRepo = $derived.by(() => {
    const path = getSelectedRepoPath()
    return path ? getRepoByPath(path) : undefined
  })

  let showSettings = $derived(getShowSettings())

  // Initialize on mount
  $effect(() => {
    init()
  })

  async function init() {
    await loadSettings()
    const settings = getSettings()

    // Reload repos from saved watched folders
    for (const folder of settings.watchedFolders) {
      await addFolder(folder)
    }

    // Start polling
    const interval = setInterval(() => {
      refreshAll()
    }, settings.refreshIntervalMs)

    // Listen for file watcher changes
    const unsubscribe = window.api.onRepoChanged((repoPath) => {
      refreshRepo(repoPath)
    })

    return () => {
      clearInterval(interval)
      unsubscribe()
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
      collapseAll()
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
    <DetailPanel repo={selectedRepo} />
  </main>

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

  :global(.status-bar) {
    grid-row: 2;
    grid-column: 1 / -1;
  }
</style>
