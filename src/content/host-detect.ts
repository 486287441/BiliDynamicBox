export function isTargetMomentsPage(url: URL = new URL(window.location.href)): boolean {
  return url.hostname === "t.bilibili.com"
}

export function isTargetHomePage(url: URL = new URL(window.location.href)): boolean {
  return url.hostname === "www.bilibili.com"
    && (url.pathname === "/" || url.pathname === "")
    && url.searchParams.get("billnext") !== "native"
}

export function isTargetPage(url: URL = new URL(window.location.href)): boolean {
  return isTargetMomentsPage(url) || isTargetHomePage(url)
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
