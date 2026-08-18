export const APP_CONTAINER_ID = "billnext-inbox-root"
const APP_MOUNT_ATTR = "data-billnext-inbox-mounted"

export function ensureAppContainer(): HTMLElement {
  document.documentElement.classList.add("billnext-inbox-page")
  document.body.classList.add("billnext-inbox-page")
  document.documentElement.classList.toggle("billnext-home-page", window.location.hostname === "www.bilibili.com")
  document.body.classList.toggle("billnext-home-page", window.location.hostname === "www.bilibili.com")

  const existing = document.getElementById(APP_CONTAINER_ID)
  if (existing instanceof HTMLElement) {
    if (existing.parentElement !== document.body) {
      document.body.appendChild(existing)
    }
    return existing
  }

  const container = document.createElement("section")
  container.id = APP_CONTAINER_ID
  container.setAttribute(APP_MOUNT_ATTR, "false")
  document.body.appendChild(container)
  return container
}

export function isContainerMounted(container: HTMLElement): boolean {
  return container.getAttribute(APP_MOUNT_ATTR) === "true"
}

export function markContainerMounted(container: HTMLElement): void {
  container.setAttribute(APP_MOUNT_ATTR, "true")
}

export function clearPageReplacement(): HTMLElement | null {
  document.documentElement.classList.remove("billnext-inbox-page", "billnext-home-page")
  document.body?.classList.remove("billnext-inbox-page", "billnext-home-page")
  const container = document.getElementById(APP_CONTAINER_ID)
  return container instanceof HTMLElement ? container : null
}
