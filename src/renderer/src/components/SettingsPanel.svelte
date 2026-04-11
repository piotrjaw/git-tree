<script lang="ts">
  import {
    getSettings,
    updateSettings,
    removeWatchedFolder
  } from '../stores/settings.svelte'
  import { removeFolder } from '../stores/repos.svelte'
  import { setShowSettings } from '../stores/ui.svelte'

  let settings = $derived(getSettings())

  let refreshSeconds = $derived(Math.round(settings.refreshIntervalMs / 1000))

  async function handleRefreshChange(e: Event) {
    const value = parseInt((e.target as HTMLInputElement).value)
    if (!isNaN(value) && value >= 5) {
      await updateSettings({ refreshIntervalMs: value * 1000 })
    }
  }

  async function handleDepthChange(e: Event) {
    const value = parseInt((e.target as HTMLInputElement).value)
    if (!isNaN(value) && value >= 1 && value <= 20) {
      await updateSettings({ maxScanDepth: value })
    }
  }

  async function handleRemoveFolder(folder: string) {
    await removeWatchedFolder(folder)
    removeFolder(folder)
  }

  function shortenPath(path: string): string {
    return path.replace(/^\/Users\/[^/]+/, '~')
  }
</script>

<div class="settings-panel">
  <div class="settings-header">
    <h3>Settings</h3>
    <button class="close-btn" onclick={() => setShowSettings(false)}>
      {@html '&times;'}
    </button>
  </div>

  <div class="settings-body">
    <div class="setting-group">
      <label for="refresh">Refresh interval (seconds)</label>
      <input
        id="refresh"
        type="number"
        min="5"
        value={refreshSeconds}
        onchange={handleRefreshChange}
      />
    </div>

    <div class="setting-group">
      <label for="depth">Max scan depth</label>
      <input
        id="depth"
        type="number"
        min="1"
        max="20"
        value={settings.maxScanDepth}
        onchange={handleDepthChange}
      />
    </div>

    <div class="setting-group">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label>Watched folders</label>
      {#if settings.watchedFolders.length === 0}
        <p class="no-folders">No folders added yet</p>
      {:else}
        <ul class="folder-list">
          {#each settings.watchedFolders as folder}
            <li>
              <span class="folder-path" title={folder}>{shortenPath(folder)}</span>
              <button class="remove-btn" onclick={() => handleRemoveFolder(folder)} title="Remove">
                {@html '&times;'}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</div>

<style>
  .settings-panel {
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-raised);
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    padding-top: 36px; /* space for macOS titlebar drag region */
    border-bottom: 1px solid var(--color-border);
  }

  .settings-header h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 18px;
    padding: 0 4px;
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--color-text);
  }

  .settings-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .setting-group label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-muted);
  }

  .setting-group input {
    padding: 6px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 13px;
    width: 80px;
  }

  .setting-group input:focus {
    outline: 1px solid var(--color-accent);
    border-color: var(--color-accent);
  }

  .no-folders {
    font-size: 12px;
    color: var(--color-text-muted);
    margin: 0;
  }

  .folder-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .folder-list li {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--color-surface);
    border-radius: 4px;
    font-size: 12px;
  }

  .folder-path {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-mono);
  }

  .remove-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 16px;
    padding: 0 4px;
    line-height: 1;
    flex-shrink: 0;
  }

  .remove-btn:hover {
    color: var(--color-danger);
  }
</style>
