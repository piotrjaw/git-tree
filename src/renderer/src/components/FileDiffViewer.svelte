<script lang="ts">
  import type { FileDiff, DiffHunk, DiffLine } from '@shared/types'

  interface Props {
    diff: FileDiff | null
    loading: boolean
    onclose: () => void
  }

  let { diff, loading, onclose }: Props = $props()

  let leftPaneEl = $state<HTMLDivElement | null>(null)
  let rightPaneEl = $state<HTMLDivElement | null>(null)
  let syncing = false

  function syncScroll(source: HTMLDivElement, target: HTMLDivElement) {
    if (syncing) return
    syncing = true
    target.scrollLeft = source.scrollLeft
    target.scrollTop = source.scrollTop
    syncing = false
  }

  $effect(() => {
    if (leftPaneEl && rightPaneEl) {
      const l = leftPaneEl
      const r = rightPaneEl
      const onLeftScroll = () => syncScroll(l, r)
      const onRightScroll = () => syncScroll(r, l)
      l.addEventListener('scroll', onLeftScroll)
      r.addEventListener('scroll', onRightScroll)
      return () => {
        l.removeEventListener('scroll', onLeftScroll)
        r.removeEventListener('scroll', onRightScroll)
      }
    }
  })

  // Build paired rows for side-by-side display
  interface SideBySideRow {
    oldLineNo: number | null
    oldContent: string
    oldType: 'add' | 'del' | 'context' | 'empty' | 'separator'
    newLineNo: number | null
    newContent: string
    newType: 'add' | 'del' | 'context' | 'empty' | 'separator'
  }

  let rows = $derived.by(() => {
    if (!diff) return []
    const result: SideBySideRow[] = []

    for (let h = 0; h < diff.hunks.length; h++) {
      const hunk = diff.hunks[h]
      // Add hunk separator — skip only if first hunk starts at line 1
      if (h > 0 || (hunk.oldStart > 1 && hunk.newStart > 1)) {
        result.push({
          oldLineNo: null, oldContent: '', oldType: 'separator',
          newLineNo: null, newContent: '', newType: 'separator'
        })
      }

      let i = 0
      while (i < hunk.lines.length) {
        const line = hunk.lines[i]

        if (line.type === 'context') {
          result.push({
            oldLineNo: line.oldLineNo, oldContent: line.content, oldType: 'context',
            newLineNo: line.newLineNo, newContent: line.content, newType: 'context'
          })
          i++
        } else if (line.type === 'del') {
          // Collect consecutive del lines, then pair with following add lines
          const dels: DiffLine[] = []
          while (i < hunk.lines.length && hunk.lines[i].type === 'del') {
            dels.push(hunk.lines[i])
            i++
          }
          const adds: DiffLine[] = []
          while (i < hunk.lines.length && hunk.lines[i].type === 'add') {
            adds.push(hunk.lines[i])
            i++
          }
          const maxLen = Math.max(dels.length, adds.length)
          for (let j = 0; j < maxLen; j++) {
            const d = dels[j]
            const a = adds[j]
            result.push({
              oldLineNo: d?.oldLineNo ?? null,
              oldContent: d?.content ?? '',
              oldType: d ? 'del' : 'empty',
              newLineNo: a?.newLineNo ?? null,
              newContent: a?.content ?? '',
              newType: a ? 'add' : 'empty'
            })
          }
        } else if (line.type === 'add') {
          result.push({
            oldLineNo: null, oldContent: '', oldType: 'empty',
            newLineNo: line.newLineNo, newContent: line.content, newType: 'add'
          })
          i++
        }
      }
    }

    return result
  })
</script>

<div class="diff-overlay">
  <div class="diff-header">
    <span class="diff-path" title={diff?.path}>{diff?.path ?? ''}</span>
    <button class="close-btn" onclick={onclose}>&times;</button>
  </div>

  {#if loading}
    <div class="diff-loading">
      <div class="spinner"></div>
      <span>Loading diff...</span>
    </div>
  {:else if diff}
    <div class="diff-content">
      <!-- Old (left) pane -->
      <div class="diff-pane" bind:this={leftPaneEl}>
        <table class="diff-table">
          <tbody>
            {#each rows as row, i (i)}
              <tr class="diff-row">
                <td class="line-no {row.oldType}">{row.oldType === 'separator' ? '...' : (row.oldLineNo ?? '')}</td>
                <td class="code {row.oldType}"><pre>{row.oldType !== 'empty' && row.oldType !== 'separator' ? row.oldContent : ''}</pre></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Gutter -->
      <div class="gutter"></div>

      <!-- New (right) pane -->
      <div class="diff-pane" bind:this={rightPaneEl}>
        <table class="diff-table">
          <tbody>
            {#each rows as row, i (i)}
              <tr class="diff-row">
                <td class="line-no {row.newType}">{row.newType === 'separator' ? '...' : (row.newLineNo ?? '')}</td>
                <td class="code {row.newType}"><pre>{row.newType !== 'empty' && row.newType !== 'separator' ? row.newContent : ''}</pre></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<style>
  .diff-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-bg);
    display: flex;
    flex-direction: column;
    z-index: 10;
  }

  .diff-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    padding-top: 36px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    flex-shrink: 0;
  }

  .diff-path {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 22px;
    padding: 0 4px;
    line-height: 1;
    flex-shrink: 0;
  }

  .close-btn:hover {
    color: var(--color-text);
  }

  .diff-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 24px;
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

  .diff-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .diff-pane {
    flex: 1;
    overflow: auto;
    min-width: 0;
  }

  .gutter {
    width: 4px;
    flex-shrink: 0;
    background: var(--color-border);
  }

  .diff-table {
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.5;
    min-width: 100%;
  }

  .diff-row {
    border-bottom: none;
    height: 18px;
  }

  .line-no {
    text-align: right;
    padding: 0 8px;
    color: rgba(139, 141, 148, 0.5);
    user-select: none;
    vertical-align: top;
    font-size: 11px;
    width: 50px;
    min-width: 50px;
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--color-bg);
  }

  .code {
    padding: 0 8px;
    white-space: pre;
    vertical-align: top;
  }

  .code pre {
    margin: 0;
    font: inherit;
    white-space: pre;
    min-height: 18px;
  }

  /* Context lines */
  .code.context {
    background: transparent;
  }

  .line-no.context {
    background: var(--color-bg);
  }

  /* Deletions (old side - red) */
  .code.del {
    background: rgba(248, 81, 73, 0.15);
    color: var(--color-text);
  }

  .line-no.del {
    background: #2d1b1e;
  }

  /* Additions (new side - green) */
  .code.add {
    background: rgba(63, 185, 80, 0.15);
    color: var(--color-text);
  }

  .line-no.add {
    background: #1b2d1e;
  }

  /* Separator (hidden lines indicator) */
  .line-no.separator {
    background: var(--color-surface);
    color: var(--color-text-muted);
    opacity: 0.8;
    text-align: center;
  }

  .code.separator {
    background: var(--color-surface);
    border-top: 1px dashed var(--color-border);
    border-bottom: 1px dashed var(--color-border);
  }

  /* Empty (padding for unmatched del/add) */
  .code.empty,
  .line-no.empty {
    background: var(--color-surface);
  }

  @media (prefers-color-scheme: light) {
    .code.del {
      background: rgba(207, 34, 46, 0.1);
    }
    .line-no.del {
      background: #fef0f0;
    }
    .code.add {
      background: rgba(26, 127, 55, 0.1);
    }
    .line-no.add {
      background: #eef8f0;
    }
  }
</style>
