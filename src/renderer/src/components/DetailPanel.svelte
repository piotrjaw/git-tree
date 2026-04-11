<script lang="ts">
  import type { RepoStatus } from '@shared/types'
  import CommitItem from './CommitItem.svelte'
  import FileItem from './FileItem.svelte'

  interface Props {
    repo: RepoStatus | undefined
  }

  let { repo }: Props = $props()

  const ICON_LINK = '\u{1F517}'
  const ICON_BRANCH = '\u{1F33F}'
</script>

{#if !repo}
  <div class="empty-state">
    <div class="empty-icon">{@html '&#128268;'}</div>
    <h2>No repository selected</h2>
    <p>Select a repository from the sidebar to view its status</p>
  </div>
{:else}
  <div class="detail-panel">
    <header class="repo-header">
      <h2>{repo.name}</h2>
      {#if repo.error}
        <div class="error-banner">{repo.error}</div>
      {/if}
      <div class="branch-info">
        <span class="branch-icon">{repo.branch.detached ? ICON_LINK : ICON_BRANCH}</span>
        <span class="branch-name">{repo.branch.current}</span>
        {#if repo.branch.tracking}
          <span class="tracking">{@html '&rarr;'} {repo.branch.tracking}</span>
        {/if}
        {#if repo.branch.ahead > 0}
          <span class="ahead">{repo.branch.ahead}{@html '&uarr;'}</span>
        {/if}
        {#if repo.branch.behind > 0}
          <span class="behind">{repo.branch.behind}{@html '&darr;'}</span>
        {/if}
      </div>
      {#if repo.tags.length > 0}
        <div class="tags-row">
          {#each repo.tags as tag}
            <span class="tag">{tag}</span>
          {/each}
        </div>
      {/if}
    </header>

    <div class="sections">
      <!-- Recent Commits -->
      {#if repo.recentCommits.length > 0}
        <section>
          <h3>Recent Commits</h3>
          <div class="commit-list">
            {#each repo.recentCommits as commit}
              <CommitItem {commit} />
            {/each}
          </div>
        </section>
      {/if}

      <!-- Staged -->
      {#if repo.staged.length > 0}
        <section>
          <h3>
            Staged
            <span class="count success">{repo.staged.length}</span>
          </h3>
          <div class="file-list">
            {#each repo.staged as file}
              <FileItem {file} depth={0} />
            {/each}
          </div>
        </section>
      {/if}

      <!-- Modified -->
      {#if repo.unstaged.length > 0}
        <section>
          <h3>
            Modified
            <span class="count warning">{repo.unstaged.length}</span>
          </h3>
          <div class="file-list">
            {#each repo.unstaged as file}
              <FileItem {file} depth={0} />
            {/each}
          </div>
        </section>
      {/if}

      <!-- Untracked -->
      {#if repo.untracked.length > 0}
        <section>
          <h3>
            Untracked
            <span class="count neutral">{repo.untracked.length}</span>
          </h3>
          <div class="file-list">
            {#each repo.untracked as filePath}
              <div class="untracked-file">
                <span class="status-q">?</span>
                <span class="fpath">{filePath}</span>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Stashes -->
      {#if repo.stashCount > 0}
        <section>
          <h3>Stashes <span class="count info">{repo.stashCount}</span></h3>
        </section>
      {/if}

      <!-- Clean state -->
      {#if repo.staged.length === 0 && repo.unstaged.length === 0 && repo.untracked.length === 0}
        <section>
          <div class="clean-state">
            <span class="clean-icon">{@html '&#10004;'}</span>
            Working tree clean
          </div>
        </section>
      {/if}
    </div>
  </div>
{/if}

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-muted);
    gap: 8px;
  }

  .empty-icon {
    font-size: 48px;
    opacity: 0.3;
  }

  .empty-state h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
  }

  .empty-state p {
    margin: 0;
    font-size: 13px;
  }

  .detail-panel {
    height: 100%;
    overflow-y: auto;
    padding: 16px 20px;
  }

  .repo-header {
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--color-border);
  }

  .repo-header h2 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
  }

  .error-banner {
    background: var(--color-danger-bg);
    color: var(--color-danger);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .branch-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
  }

  .branch-icon {
    font-size: 16px;
  }

  .branch-name {
    font-weight: 600;
    color: var(--color-accent);
  }

  .tracking {
    color: var(--color-text-muted);
    font-size: 12px;
  }

  .ahead {
    color: var(--color-success);
    font-weight: 600;
    font-size: 12px;
  }

  .behind {
    color: var(--color-danger);
    font-weight: 600;
    font-size: 12px;
  }

  .tags-row {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    flex-wrap: wrap;
  }

  .tag {
    background: var(--color-info-bg);
    color: var(--color-info);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
  }

  .sections {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  section h3 {
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .count {
    font-size: 11px;
    padding: 0 6px;
    border-radius: 10px;
    font-weight: 500;
  }

  .count.success {
    background: var(--color-success-bg);
    color: var(--color-success);
  }
  .count.warning {
    background: var(--color-warning-bg);
    color: var(--color-warning);
  }
  .count.info {
    background: var(--color-info-bg);
    color: var(--color-info);
  }
  .count.neutral {
    background: var(--color-neutral-bg);
    color: var(--color-text-muted);
  }

  .commit-list,
  .file-list {
    border-radius: 6px;
    background: var(--color-surface-raised);
    overflow: hidden;
  }

  .untracked-file {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    font-size: 12px;
    font-family: var(--font-mono);
    min-height: 26px;
  }

  .untracked-file:hover {
    background: var(--color-hover);
  }

  .status-q {
    color: var(--color-text-muted);
    font-weight: 700;
    width: 14px;
    text-align: center;
  }

  .fpath {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text-muted);
  }

  .clean-state {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-success);
    font-size: 14px;
    padding: 12px;
    background: var(--color-surface-raised);
    border-radius: 6px;
  }

  .clean-icon {
    font-size: 16px;
  }
</style>
