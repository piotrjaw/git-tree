<script lang="ts">
  import type { CommitDetail } from '@shared/types'

  interface Props {
    detail: CommitDetail | null
    loading: boolean
    onclose: () => void
  }

  let { detail, loading, onclose }: Props = $props()

  const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
    added: { icon: 'A', color: 'var(--color-success)' },
    modified: { icon: 'M', color: 'var(--color-warning)' },
    deleted: { icon: 'D', color: 'var(--color-danger)' },
    renamed: { icon: 'R', color: 'var(--color-info)' },
    copied: { icon: 'C', color: 'var(--color-info)' },
    'type-change': { icon: 'T', color: 'var(--color-text-muted)' }
  }

  let totalAdditions = $derived(detail?.files.reduce((s, f) => s + f.additions, 0) ?? 0)
  let totalDeletions = $derived(detail?.files.reduce((s, f) => s + f.deletions, 0) ?? 0)

  function relativeTime(dateStr: string): string {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    if (isNaN(then)) return dateStr
    const diff = now - then
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 30) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
  }
</script>

<div class="commit-detail">
  <div class="detail-header">
    <h3>Commit Detail</h3>
    <button class="close-btn" onclick={onclose} title="Close">&times;</button>
  </div>

  {#if loading}
    <div class="detail-loading">
      <div class="spinner"></div>
      <span>Loading...</span>
    </div>
  {:else if detail}
    <div class="detail-body">
      <!-- Commit info -->
      <div class="commit-info">
        <div class="commit-message-full">{detail.message}</div>
        {#if detail.body}
          <div class="commit-body">{detail.body}</div>
        {/if}
        <div class="commit-meta">
          <span class="hash" title={detail.hash}>{detail.hash.slice(0, 7)}</span>
          <span class="author">{detail.author}</span>
          <span class="date">{relativeTime(detail.date)}</span>
        </div>
      </div>

      <!-- File stats summary -->
      <div class="file-stats-summary">
        <span class="file-count">{detail.files.length} file{detail.files.length !== 1 ? 's' : ''}</span>
        {#if totalAdditions > 0}
          <span class="additions">+{totalAdditions}</span>
        {/if}
        {#if totalDeletions > 0}
          <span class="deletions">-{totalDeletions}</span>
        {/if}
      </div>

      <!-- File list -->
      <div class="file-list">
        {#each detail.files as file}
          {@const st = STATUS_ICONS[file.status] || STATUS_ICONS['modified']}
          <div class="file-row">
            <span class="file-status" style="color: {st.color}">{st.icon}</span>
            <span class="file-path" title={file.path}>{file.path}</span>
            <span class="file-diff">
              {#if file.additions > 0}
                <span class="add">+{file.additions}</span>
              {/if}
              {#if file.deletions > 0}
                <span class="del">-{file.deletions}</span>
              {/if}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .commit-detail {
    display: flex;
    flex-direction: column;
    height: 100%;
    border-left: 1px solid var(--color-border);
    background: var(--color-surface);
    min-width: 300px;
  }

  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    padding-top: 36px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .detail-header h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 20px;
    padding: 0 4px;
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--color-text);
  }

  .detail-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px;
    color: var(--color-text-muted);
    font-size: 13px;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .detail-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .commit-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .commit-message-full {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
    word-wrap: break-word;
  }

  .commit-body {
    font-size: 12px;
    color: var(--color-text-muted);
    white-space: pre-wrap;
    word-wrap: break-word;
    line-height: 1.5;
  }

  .commit-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .hash {
    font-family: var(--font-mono);
    color: var(--color-accent);
  }

  .file-stats-summary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: var(--color-surface-raised);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
  }

  .file-count {
    color: var(--color-text-muted);
  }

  .additions {
    color: var(--color-success);
  }

  .deletions {
    color: var(--color-danger);
  }

  .file-list {
    display: flex;
    flex-direction: column;
    border-radius: 6px;
    background: var(--color-surface-raised);
    overflow: hidden;
  }

  .file-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    font-size: 12px;
    min-height: 28px;
  }

  .file-row:hover {
    background: var(--color-hover);
  }

  .file-status {
    font-family: var(--font-mono);
    font-weight: 700;
    width: 14px;
    text-align: center;
    flex-shrink: 0;
    font-size: 11px;
  }

  .file-path {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-text);
  }

  .file-diff {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .file-diff .add {
    color: var(--color-success);
  }

  .file-diff .del {
    color: var(--color-danger);
  }
</style>
