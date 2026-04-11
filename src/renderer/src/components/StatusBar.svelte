<script lang="ts">
  import { getRepoCount, isLoading } from '../stores/repos.svelte'
  import { getSettings } from '../stores/settings.svelte'

  let lastRefresh = $state(Date.now())
  let now = $state(Date.now())

  // Update "now" every second for relative time display
  $effect(() => {
    const interval = setInterval(() => {
      now = Date.now()
    }, 1000)
    return () => clearInterval(interval)
  })

  // Track last refresh
  $effect(() => {
    if (!isLoading()) {
      lastRefresh = Date.now()
    }
  })

  let repoCount = $derived(getRepoCount())
  let folderCount = $derived(getSettings().watchedFolders.length)
  let loading = $derived(isLoading())

  let timeSinceRefresh = $derived.by(() => {
    const diff = Math.floor((now - lastRefresh) / 1000)
    if (diff < 5) return 'just now'
    if (diff < 60) return `${diff}s ago`
    return `${Math.floor(diff / 60)}m ago`
  })
</script>

<div class="status-bar">
  <span class="status-item">
    {repoCount} repo{repoCount !== 1 ? 's' : ''}
  </span>
  <span class="separator">{@html '&middot;'}</span>
  <span class="status-item">
    {loading ? 'Refreshing...' : `Last refresh: ${timeSinceRefresh}`}
  </span>
  <span class="separator">{@html '&middot;'}</span>
  <span class="status-item">
    Watching: {folderCount} folder{folderCount !== 1 ? 's' : ''}
  </span>
</div>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    font-size: 11px;
    color: var(--color-text-muted);
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
    min-height: 24px;
  }

  .separator {
    opacity: 0.4;
  }
</style>
