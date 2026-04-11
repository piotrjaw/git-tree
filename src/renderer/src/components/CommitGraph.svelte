<script lang="ts">
  import type { GraphData, GraphLayoutNode } from '@shared/types'
  import { getSelectedRepoPath } from '../stores/ui.svelte'

  interface Props {
    onSelectCommit?: (hash: string) => void
    onCheckoutBranch?: (branch: string) => void
    selectedCommitHash?: string | null
  }

  let { onSelectCommit, onCheckoutBranch, selectedCommitHash = null }: Props = $props()

  const ROW_HEIGHT = 32
  const COL_WIDTH = 16
  const NODE_RADIUS = 4
  const MERGE_RADIUS = 5
  const GRAPH_LEFT_PAD = 12
  const BUFFER_ROWS = 10

  let graphData = $state<GraphData | null>(null)
  let loading = $state(false)
  let error = $state<string | null>(null)
  let containerEl = $state<HTMLDivElement | null>(null)
  let canvasEl = $state<HTMLCanvasElement | null>(null)
  let scrollTop = $state(0)
  let containerHeight = $state(0)

  let selectedRepoPath = $derived(getSelectedRepoPath())

  // Load graph when repo changes
  $effect(() => {
    const path = selectedRepoPath
    if (path) {
      loadGraph(path)
    } else {
      graphData = null
    }
  })

  async function loadGraph(repoPath: string) {
    loading = true
    error = null
    try {
      graphData = await window.api.getCommitGraph(repoPath)
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
      graphData = null
    } finally {
      loading = false
    }
  }

  // Virtual scroll calculations
  let totalHeight = $derived(graphData ? graphData.nodes.length * ROW_HEIGHT : 0)
  let graphColumnWidth = $derived(graphData ? GRAPH_LEFT_PAD + graphData.totalColumns * COL_WIDTH + 16 : 80)

  let visibleRange = $derived.by(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS)
    const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + BUFFER_ROWS * 2
    const end = graphData ? Math.min(graphData.nodes.length, start + visibleCount) : 0
    return { start, end }
  })

  let visibleNodes = $derived(
    graphData ? graphData.nodes.slice(visibleRange.start, visibleRange.end) : []
  )

  function handleScroll() {
    if (containerEl) {
      scrollTop = containerEl.scrollTop
    }
  }

  // Draw canvas when visible nodes change
  $effect(() => {
    if (canvasEl && graphData && visibleNodes.length > 0) {
      drawGraph(canvasEl, graphData, visibleRange.start, visibleRange.end, graphColumnWidth)
    }
  })

  // Track container size
  $effect(() => {
    if (containerEl) {
      const ro = new ResizeObserver((entries) => {
        containerHeight = entries[0].contentRect.height
      })
      ro.observe(containerEl)
      return () => ro.disconnect()
    }
  })

  function drawGraph(
    canvas: HTMLCanvasElement,
    data: GraphData,
    startRow: number,
    endRow: number,
    colWidth: number
  ) {
    const dpr = window.devicePixelRatio || 1
    const visibleHeight = (endRow - startRow) * ROW_HEIGHT
    const width = colWidth

    canvas.width = width * dpr
    canvas.height = visibleHeight * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${visibleHeight}px`

    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, visibleHeight)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const colX = (col: number) => GRAPH_LEFT_PAD + col * COL_WIDTH + COL_WIDTH / 2
    const rowY = (row: number) => (row - startRow) * ROW_HEIGHT + ROW_HEIGHT / 2

    // Scan ALL nodes to find links that cross through the visible area.
    // This ensures pass-through lines from off-screen commits are drawn.
    for (let i = 0; i < data.nodes.length; i++) {
      const node = data.nodes[i]
      for (const link of node.parentLinks) {
        const y1 = rowY(link.fromRow)
        const y2 = rowY(link.toRow)

        // Skip if entirely outside visible area (with generous margin)
        if (y1 > visibleHeight + ROW_HEIGHT * 2 && y2 > visibleHeight + ROW_HEIGHT * 2) continue
        if (y1 < -ROW_HEIGHT * 2 && y2 < -ROW_HEIGHT * 2) continue

        ctx.strokeStyle = link.color
        ctx.lineWidth = 2
        ctx.beginPath()

        if (link.fromCol === link.toCol) {
          // Straight vertical line
          ctx.moveTo(colX(link.fromCol), y1)
          ctx.lineTo(colX(link.toCol), y2)
        } else {
          // Cross-column: short S-curve then vertical
          const x1 = colX(link.fromCol)
          const x2 = colX(link.toCol)
          // Curve completes within ~2 rows
          const curveEndY = Math.min(y1 + ROW_HEIGHT * 2, y2)
          const cp1Y = y1 + (curveEndY - y1) * 0.4
          const cp2Y = y1 + (curveEndY - y1) * 0.6

          ctx.moveTo(x1, y1)
          ctx.bezierCurveTo(x1, cp1Y, x2, cp2Y, x2, curveEndY)
          // Continue vertical to parent
          if (curveEndY < y2) {
            ctx.lineTo(x2, y2)
          }
        }
        ctx.stroke()
      }

      // Early exit: if this node and all its links are entirely below visible area
      if (node.row > endRow + BUFFER_ROWS) break
    }

    // Draw nodes on top
    for (let i = startRow; i < endRow; i++) {
      const node = data.nodes[i]
      const x = colX(node.column)
      const y = rowY(node.row)

      ctx.fillStyle = node.color
      ctx.strokeStyle = '#1a1b1e'
      ctx.lineWidth = 2

      if (node.isMerge) {
        // Merge commit: slightly larger circle
        ctx.beginPath()
        ctx.arc(x, y, MERGE_RADIUS, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      } else {
        // Regular commit: filled circle
        ctx.beginPath()
        ctx.arc(x, y, NODE_RADIUS, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    }

    ctx.lineWidth = 2
  }

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
    if (days < 365) return `${Math.floor(days / 30)}mo ago`
    return `${Math.floor(days / 365)}y ago`
  }

  function refLabel(ref: string): { name: string; checkoutName: string; type: 'head' | 'branch' | 'tag' | 'remote' } {
    if (ref.startsWith('HEAD -> ')) {
      const name = ref.replace('HEAD -> ', '')
      return { name, checkoutName: name, type: 'head' }
    }
    if (ref.startsWith('tag: ')) {
      const name = ref.replace('tag: ', '')
      return { name, checkoutName: name, type: 'tag' }
    }
    // origin/foo, upstream/foo — remote tracking refs; checkout strips the remote prefix
    const remoteMatch = ref.match(/^([^/]+)\/(.+)$/)
    if (remoteMatch && ['origin', 'upstream', 'remote'].includes(remoteMatch[1])) {
      return { name: ref, checkoutName: remoteMatch[2], type: 'remote' }
    }
    return { name: ref, checkoutName: ref, type: 'branch' }
  }
</script>

{#if !selectedRepoPath}
  <div class="empty-state">
    <div class="empty-icon">&#128268;</div>
    <h2>No repository selected</h2>
    <p>Select a repository from the sidebar to view its commit graph</p>
  </div>
{:else if loading}
  <div class="empty-state">
    <div class="loading-spinner"></div>
    <p>Loading commit graph...</p>
  </div>
{:else if error}
  <div class="empty-state">
    <div class="error-icon">&#9888;</div>
    <h2>Error loading graph</h2>
    <p>{error}</p>
  </div>
{:else if graphData}
  <div class="graph-container" bind:this={containerEl} onscroll={handleScroll}>
    <div class="graph-scroll-area" style="height: {totalHeight}px">
      <div
        class="graph-visible"
        style="transform: translateY({visibleRange.start * ROW_HEIGHT}px)"
      >
        <!-- Canvas for graph lines -->
        <canvas
          class="graph-canvas"
          bind:this={canvasEl}
          style="width: {graphColumnWidth}px"
        ></canvas>

        <!-- Commit rows -->
        <div class="commit-rows" style="margin-left: {graphColumnWidth}px">
          {#each visibleNodes as node (node.commit.hash)}
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <div
              class="commit-row"
              class:selected={selectedCommitHash === node.commit.hash}
              style="height: {ROW_HEIGHT}px"
              onclick={(e) => {
                if (e.target instanceof HTMLElement && e.target.closest('.ref-badge')) return
                onSelectCommit?.(node.commit.hash)
              }}
            >
              <!-- Ref badges -->
              {#if node.commit.refs.length > 0}
                <span class="refs">
                  {#each node.commit.refs as ref}
                    {@const r = refLabel(ref)}
                    {#if r.type === 'branch' || r.type === 'head' || r.type === 'remote'}
                      <button
                        class="ref-badge ref-{r.type} clickable"
                        style={r.type === 'head' ? `background: ${node.color}` : ''}
                        onclick={(e) => { e.stopPropagation(); onCheckoutBranch?.(r.checkoutName); }}
                        title="Checkout {r.checkoutName}"
                      >{r.name}</button>
                    {:else}
                      <span class="ref-badge ref-{r.type}">{r.name}</span>
                    {/if}
                  {/each}
                </span>
              {/if}

              <!-- Commit message -->
              <span class="commit-message" title={node.commit.message}>{node.commit.message}</span>

              <!-- Hash -->
              <span class="commit-hash">{node.commit.hashShort}</span>

              <!-- Author -->
              <span class="commit-author">{node.commit.author}</span>

              <!-- Date -->
              <span class="commit-date">{relativeTime(node.commit.date)}</span>
            </div>
          {/each}
        </div>
      </div>
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
    padding-top: 36px;
  }

  .empty-icon,
  .error-icon {
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

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .graph-container {
    height: 100%;
    overflow-y: auto;
    overflow-x: auto;
    padding-top: 36px;
    position: relative;
  }

  .graph-scroll-area {
    position: relative;
    min-width: 100%;
  }

  .graph-visible {
    position: relative;
    display: flex;
  }

  .graph-canvas {
    position: sticky;
    left: 0;
    flex-shrink: 0;
    z-index: 1;
  }

  .commit-rows {
    flex: 1;
    min-width: 0;
  }

  .commit-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px 0 0;
    font-size: 13px;
    white-space: nowrap;
  }

  .commit-row {
    cursor: pointer;
  }

  .commit-row.selected {
    background: var(--color-selected);
  }

  .commit-row:hover {
    background: var(--color-hover);
  }

  .refs {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .ref-badge {
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.4;
    flex-shrink: 0;
    border: none;
    font-family: inherit;
  }

  .ref-badge.clickable {
    cursor: pointer;
    transition: filter 0.15s;
  }

  .ref-badge.clickable:hover {
    filter: brightness(1.3);
  }

  .ref-head {
    color: #fff;
    outline: 2px solid #fff;
    outline-offset: -1px;
  }

  .ref-branch {
    background: rgba(88, 166, 255, 0.2);
    color: var(--color-accent);
    border: 1px solid var(--color-accent);
  }

  .ref-tag {
    background: var(--color-warning-bg);
    color: var(--color-warning);
    border: 1px solid var(--color-warning);
  }

  .ref-remote {
    background: var(--color-neutral-bg);
    color: var(--color-text-muted);
    border: 1px solid transparent;
  }

  .commit-message {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--color-text);
  }

  .commit-hash {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-accent);
    flex-shrink: 0;
    opacity: 0.8;
  }

  .commit-author {
    color: var(--color-text-muted);
    font-size: 12px;
    flex-shrink: 0;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .commit-date {
    color: var(--color-text-muted);
    font-size: 11px;
    flex-shrink: 0;
    min-width: 60px;
    text-align: right;
  }
</style>
