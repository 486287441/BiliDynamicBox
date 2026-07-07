/** 等待浏览器完成布局，以便 scrollHeight 等尺寸反映最新 DOM */
export function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

export function getDistanceToBottom(scrollRoot: HTMLElement): number {
  return scrollRoot.scrollHeight - scrollRoot.scrollTop - scrollRoot.clientHeight
}

/** 滚动预加载目标：始终保留约 N 个视口高度的未滚动内容 */
export function getScrollBufferPx(scrollRoot: HTMLElement, viewportCount = 1): number {
  return scrollRoot.clientHeight * viewportCount
}

export function getInboxScrollRoot(): HTMLElement | null {
  const root = document.getElementById("bewly-inbox-root")
  return root instanceof HTMLElement ? root : null
}

export function isVisibleInScrollRoot(
  element: HTMLElement,
  scrollRoot: HTMLElement | null,
  marginPx = 320,
): boolean {
  const rootRect = scrollRoot
    ? scrollRoot.getBoundingClientRect()
    : {
        top: 0,
        left: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
      }
  const rect = element.getBoundingClientRect()
  return rect.bottom >= rootRect.top - marginPx && rect.top <= rootRect.bottom + marginPx
}
