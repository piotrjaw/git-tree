<script lang="ts">
  import type { CommitSummary } from '@shared/types'

  interface Props {
    commit: CommitSummary
  }

  let { commit }: Props = $props()

  function relativeTime(dateStr: string): string {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
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

<div class="commit-item">
  <span class="hash">{commit.hash}</span>
  <span class="message" title={commit.message}>{commit.message}</span>
  <span class="date">{relativeTime(commit.date)}</span>
</div>

<style>
  .commit-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    font-size: 12px;
    min-height: 26px;
  }

  .commit-item:hover {
    background: var(--color-hover);
    border-radius: 4px;
  }

  .hash {
    font-family: var(--font-mono);
    color: var(--color-accent);
    flex-shrink: 0;
    font-size: 11px;
  }

  .message {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text);
  }

  .date {
    color: var(--color-text-muted);
    flex-shrink: 0;
    font-size: 11px;
  }
</style>
