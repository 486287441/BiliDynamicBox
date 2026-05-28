const TARGET_HOST = "t.bilibili.com"
const TARGET_PATH_PREFIX = "/"

export function isTargetMomentsPage(url: URL = new URL(window.location.href)): boolean {
  return url.hostname === TARGET_HOST && url.pathname.startsWith(TARGET_PATH_PREFIX)
}

export function waitForDocumentReady(): Promise<void> {
  if (document.readyState === "interactive" || document.readyState === "complete") {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const onReady = () => {
      document.removeEventListener("DOMContentLoaded", onReady)
      resolve()
    }
    document.addEventListener("DOMContentLoaded", onReady)
  })
}
