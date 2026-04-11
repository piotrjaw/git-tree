<script lang="ts">
  import type { FileChange } from '@shared/types'

  interface Props {
    file: FileChange
    depth?: number
  }

  let { file, depth = 0 }: Props = $props()

  const statusIcons: Record<string, string> = {
    modified: 'M',
    added: 'A',
    deleted: 'D',
    renamed: 'R',
    copied: 'C',
    unmerged: 'U'
  }

  const statusColors: Record<string, string> = {
    modified: 'var(--color-warning)',
    added: 'var(--color-success)',
    deleted: 'var(--color-danger)',
    renamed: 'var(--color-info)',
    copied: 'var(--color-info)',
    unmerged: 'var(--color-danger)'
  }
</script>

<div class="file-item" style="padding-left: calc(8px + {depth} * 16px)">
  <span class="status-icon" style="color: {statusColors[file.status] || 'var(--color-text-muted)'}">
    {statusIcons[file.status] || '?'}
  </span>
  <span class="file-path" title={file.path}>
    {file.path}
  </span>
</div>

<style>
  .file-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 8px;
    min-height: 24px;
    font-size: 12px;
    font-family: var(--font-mono);
  }

  .file-item:hover {
    background: var(--color-hover);
    border-radius: 4px;
  }

  .status-icon {
    font-weight: 700;
    width: 14px;
    text-align: center;
    flex-shrink: 0;
  }

  .file-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text-muted);
  }
</style>
