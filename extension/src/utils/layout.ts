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
