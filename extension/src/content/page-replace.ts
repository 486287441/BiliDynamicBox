export const APP_CONTAINER_ID = "bewly-inbox-root"
const APP_MOUNT_ATTR = "data-bewly-inbox-mounted"

export function ensureAppContainer(): HTMLElement {
  document.documentElement.classList.add("bewly-inbox-page")
  document.body.classList.add("bewly-inbox-page")

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
