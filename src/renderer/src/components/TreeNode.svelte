<script lang="ts">
  import { isExpanded, toggleExpanded } from '../stores/ui.svelte'

  interface Props {
    id: string
    label: string
    icon?: string
    badge?: string | number
    badgeVariant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
    hasChildren?: boolean
    depth?: number
    selected?: boolean
    onclick?: () => void
    children?: import('svelte').Snippet
  }

  let {
    id,
    label,
    icon,
    badge,
    badgeVariant = 'neutral',
    hasChildren = false,
    depth = 0,
    selected = false,
    onclick,
    children
  }: Props = $props()

  let expanded = $derived(isExpanded(id))

  function handleToggle(e: MouseEvent) {
    e.stopPropagation()
    toggleExpanded(id)
  }

  function handleClick() {
    onclick?.()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (hasChildren) {
        toggleExpanded(id)
      }
      onclick?.()
    }
    if (e.key === 'ArrowRight' && hasChildren && !expanded) {
      e.preventDefault()
      toggleExpanded(id)
    }
    if (e.key === 'ArrowLeft' && hasChildren && expanded) {
      e.preventDefault()
      toggleExpanded(id)
    }
  }
</script>

<div class="tree-node" class:selected style="--depth: {depth}">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="node-row"
    onclick={handleClick}
    onkeydown={handleKeydown}
    tabindex="0"
    role="treeitem"
    aria-selected={selected}
    aria-expanded={hasChildren ? expanded : undefined}
  >
    {#if hasChildren}
      <button class="toggle" onclick={handleToggle} aria-label={expanded ? 'Collapse' : 'Expand'}>
        <span class="arrow" class:expanded>{@html '&#9654;'}</span>
      </button>
    {:else}
      <span class="toggle-spacer"></span>
    {/if}

    {#if icon}
      <span class="node-icon">{icon}</span>
    {/if}

    <span class="node-label">{label}</span>

    {#if badge !== undefined}
      <span class="node-badge {badgeVariant}">{badge}</span>
    {/if}
  </div>

  {#if hasChildren && expanded && children}
    <div class="node-children" role="group">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .tree-node {
    user-select: none;
  }

  .node-row {
    display: flex;
    align-items: center;
    padding: 3px 8px;
    padding-left: calc(8px + var(--depth) * 16px);
    cursor: pointer;
    border-radius: 4px;
    gap: 4px;
    min-height: 28px;
  }

  .node-row:hover {
    background: var(--color-hover);
  }

  .node-row:focus-visible {
    outline: 1px solid var(--color-accent);
    outline-offset: -1px;
  }

  .selected > .node-row {
    background: var(--color-selected);
  }

  .toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: none;
    background: none;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    font-size: 8px;
  }

  .toggle:hover {
    color: var(--color-text);
  }

  .arrow {
    display: inline-block;
    transition: transform 0.15s ease;
  }

  .arrow.expanded {
    transform: rotate(90deg);
  }

  .toggle-spacer {
    width: 16px;
    flex-shrink: 0;
  }

  .node-icon {
    flex-shrink: 0;
    font-size: 14px;
    width: 18px;
    text-align: center;
  }

  .node-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }

  .node-badge {
    font-size: 11px;
    padding: 0 6px;
    border-radius: 10px;
    flex-shrink: 0;
    font-weight: 500;
  }

  .node-badge.success {
    background: var(--color-success-bg);
    color: var(--color-success);
  }
  .node-badge.warning {
    background: var(--color-warning-bg);
    color: var(--color-warning);
  }
  .node-badge.danger {
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }
  .node-badge.info {
    background: var(--color-info-bg);
    color: var(--color-info);
  }
  .node-badge.neutral {
    background: var(--color-neutral-bg);
    color: var(--color-text-muted);
  }

</style>
