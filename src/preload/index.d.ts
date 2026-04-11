import type { GitTreeAPI } from '@shared/types'

declare global {
  interface Window {
    api: GitTreeAPI
  }
}
