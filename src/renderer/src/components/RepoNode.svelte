<script lang="ts">
  import type { RepoStatus } from '@shared/types'
  import TreeNode from './TreeNode.svelte'
  import FileItem from './FileItem.svelte'
  import { getSelectedRepoPath, setSelectedRepoPath } from '../stores/ui.svelte'

  interface Props {
    repo: RepoStatus
    depth?: number
  }

  let { repo, depth = 0 }: Props = $props()

  const ICON_FOLDER = '\u{1F4C1}'
  const ICON_WARN = '\u26A0'
  const ICON_LINK = '\u{1F517}'
  const ICON_BRANCH = '\u{1F33F}'
  const ICON_CHECK = '\u2714'
  const ICON_EDIT = '\u270E'
  const ICON_BOX = '\u{1F4E6}'
  const ICON_TAG = '\u{1F3F7}'

  let selected = $derived(getSelectedRepoPath() === repo.path)

  let branchLabel = $derived.by(() => {
    let label = repo.branch.current
    const parts: string[] = []
    if (repo.branch.ahead > 0) parts.push(`${repo.branch.ahead}\u2191`)
    if (repo.branch.behind > 0) parts.push(`${repo.branch.behind}\u2193`)
    if (parts.length > 0) label += ` (${parts.join(' ')})`
    return label
  })

  let totalChanges = $derived(repo.staged.length + repo.unstaged.length + repo.untracked.length)

  function handleSelect() {
    setSelectedRepoPath(repo.path)
  }
</script>

<TreeNode
  id={repo.path}
  label={repo.name}
  icon={repo.error ? ICON_WARN : ICON_FOLDER}
  badge={totalChanges > 0 ? totalChanges : undefined}
  badgeVariant={totalChanges > 0 ? 'warning' : 'neutral'}
  hasChildren={true}
  {depth}
  {selected}
  onclick={handleSelect}
>
  {#snippet children()}
    <!-- Branch -->
    <TreeNode
      id="{repo.path}:branch"
      label={branchLabel}
      icon={repo.branch.detached ? ICON_LINK : ICON_BRANCH}
      badgeVariant={repo.branch.ahead > 0 ? 'success' : repo.branch.behind > 0 ? 'warning' : 'neutral'}
      depth={depth + 1}
    />

    <!-- Staged -->
    {#if repo.staged.length > 0}
      <TreeNode
        id="{repo.path}:staged"
        label="Staged"
        icon={ICON_CHECK}
        badge={repo.staged.length}
        badgeVariant="success"
        hasChildren={true}
        depth={depth + 1}
      >
        {#snippet children()}
          {#each repo.staged as file}
            <FileItem {file} depth={depth + 2} />
          {/each}
        {/snippet}
      </TreeNode>
    {/if}

    <!-- Modified -->
    {#if repo.unstaged.length > 0}
      <TreeNode
        id="{repo.path}:modified"
        label="Modified"
        icon={ICON_EDIT}
        badge={repo.unstaged.length}
        badgeVariant="warning"
        hasChildren={true}
        depth={depth + 1}
      >
        {#snippet children()}
          {#each repo.unstaged as file}
            <FileItem {file} depth={depth + 2} />
          {/each}
        {/snippet}
      </TreeNode>
    {/if}

    <!-- Untracked -->
    {#if repo.untracked.length > 0}
      <TreeNode
        id="{repo.path}:untracked"
        label="Untracked"
        icon="?"
        badge={repo.untracked.length}
        badgeVariant="neutral"
        hasChildren={true}
        depth={depth + 1}
      >
        {#snippet children()}
          {#each repo.untracked as filePath}
            <div class="file-item-simple" style="padding-left: calc(8px + {depth + 2} * 16px)">
              <span class="status-q">?</span>
              <span class="file-path" title={filePath}>{filePath}</span>
            </div>
          {/each}
        {/snippet}
      </TreeNode>
    {/if}

    <!-- Stashes -->
    {#if repo.stashCount > 0}
      <TreeNode
        id="{repo.path}:stashes"
        label="Stashes"
        icon={ICON_BOX}
        badge={repo.stashCount}
        badgeVariant="info"
        depth={depth + 1}
      />
    {/if}

    <!-- Tags -->
    {#if repo.tags.length > 0}
      <TreeNode
        id="{repo.path}:tags"
        label="Tags: {repo.tags.join(', ')}"
        icon={ICON_TAG}
        depth={depth + 1}
      />
    {/if}
  {/snippet}
</TreeNode>

<style>
  .file-item-simple {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 8px;
    min-height: 24px;
    font-size: 12px;
    font-family: var(--font-mono);
  }

  .file-item-simple:hover {
    background: var(--color-hover);
    border-radius: 4px;
  }

  .status-q {
    color: var(--color-text-muted);
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
