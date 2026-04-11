<script lang="ts">
  import type { FileDiff, DiffHunk, DiffLine } from '@shared/types'

  interface Props {
    diff: FileDiff | null
    loading: boolean
    onclose: () => void
  }

  let { diff, loading, onclose }: Props = $props()

  // Build paired rows for side-by-side display
  interface SideBySideRow {
    oldLineNo: number | null
    oldContent: string
    oldType: 'add' | 'del' | 'context' | 'empty'
    newLineNo: number | null
    newContent: string
    newType: 'add' | 'del' | 'context' | 'empty'
  }

  let rows = $derived.by(() => {
    if (!diff) return []
    const result: SideBySideRow[] = []

    for (const hunk of diff.hunks) {
      // Add hunk separator
      result.push({
        oldLineNo: null, oldContent: '...', oldType: 'context',
        newLineNo: null, newContent: '...', newType: 'context'
      })

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
      <table class="diff-table">
        <colgroup>
          <col class="line-no-col" />
          <col class="code-col" />
          <col class="gutter-col" />
          <col class="line-no-col" />
          <col class="code-col" />
        </colgroup>
        <tbody>
          {#each rows as row, i (i)}
            <tr class="diff-row">
              <!-- Old side -->
              <td class="line-no {row.oldType}">{row.oldLineNo ?? ''}</td>
              <td class="code {row.oldType}">
                {#if row.oldType !== 'empty'}
                  <pre>{row.oldContent}</pre>
                {/if}
              </td>
              <!-- Gutter -->
              <td class="gutter"></td>
              <!-- New side -->
              <td class="line-no {row.newType}">{row.newLineNo ?? ''}</td>
              <td class="code {row.newType}">
                {#if row.newType !== 'empty'}
                  <pre>{row.newContent}</pre>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
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
    overflow: auto;
  }

  .diff-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.5;
    table-layout: fixed;
  }

  .line-no-col {
    width: 50px;
  }

  .code-col {
    width: calc(50% - 27px);
  }

  .gutter-col {
    width: 4px;
  }

  .diff-row {
    border-bottom: none;
  }

  .line-no {
    text-align: right;
    padding: 0 8px;
    color: var(--color-text-muted);
    opacity: 0.5;
    user-select: none;
    vertical-align: top;
    font-size: 11px;
  }

  .gutter {
    background: var(--color-border);
  }

  .code {
    padding: 0 8px;
    white-space: pre;
    overflow: hidden;
    vertical-align: top;
  }

  .code pre {
    margin: 0;
    font: inherit;
    white-space: pre;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Context lines */
  .code.context,
  .line-no.context {
    background: transparent;
  }

  /* Deletions (old side - red) */
  .code.del {
    background: rgba(248, 81, 73, 0.15);
    color: var(--color-text);
  }

  .line-no.del {
    background: rgba(248, 81, 73, 0.1);
  }

  /* Additions (new side - green) */
  .code.add {
    background: rgba(63, 185, 80, 0.15);
    color: var(--color-text);
  }

  .line-no.add {
    background: rgba(63, 185, 80, 0.1);
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
      background: rgba(207, 34, 46, 0.06);
    }
    .code.add {
      background: rgba(26, 127, 55, 0.1);
    }
    .line-no.add {
      background: rgba(26, 127, 55, 0.06);
    }
  }
</style>
