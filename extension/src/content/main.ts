import { mountInboxApp } from "../app/main"
import { isTargetMomentsPage, waitForDocumentReady } from "./host-detect"
import {
  ensureAppContainer,
  isContainerMounted,
  markContainerMounted,
} from "./page-replace"

const HISTORY_EVENT_NAME = "bewly-history-change"

let lastUrl = window.location.href
let observerStarted = false
let bootstrapPending = false

function scheduleBootstrap(): void {
  window.setTimeout(() => {
    void bootstrap()
  }, 0)
}

async function bootstrap(): Promise<void> {
  if (bootstrapPending) {
    return
  }
  bootstrapPending = true

  if (!isTargetMomentsPage()) {
    bootstrapPending = false
    return
  }

  try {
    await waitForDocumentReady()

    const container = ensureAppContainer()
    if (isContainerMounted(container)) {
      return
    }

    mountInboxApp(container)
    markContainerMounted(container)
  } finally {
    bootstrapPending = false
  }
}

function startUrlObserver(): void {
  if (observerStarted) {
    return
  }

  observerStarted = true
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      scheduleBootstrap()
      return
    }

    if (!isTargetMomentsPage()) {
      return
    }

    const container = document.getElementById("bewly-inbox-root")
    if (!(container instanceof HTMLElement) || !isContainerMounted(container)) {
      scheduleBootstrap()
    }
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
}

window.addEventListener(HISTORY_EVENT_NAME, () => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href
  }
  scheduleBootstrap()
})

window.addEventListener("popstate", () => {
  lastUrl = window.location.href
  scheduleBootstrap()
})

window.addEventListener("hashchange", () => {
  lastUrl = window.location.href
  scheduleBootstrap()
})

window.addEventListener("pageshow", () => {
  scheduleBootstrap()
})

window.setInterval(() => {
  if (!isTargetMomentsPage()) {
    return
  }
  const container = document.getElementById("bewly-inbox-root")
  if (!(container instanceof HTMLElement) || !isContainerMounted(container)) {
    scheduleBootstrap()
  }
}, 1500)

scheduleBootstrap()
startUrlObserver()
