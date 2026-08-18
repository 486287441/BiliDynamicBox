import { fadeSlideIn, fadeSlideOut } from "../utils/motion"

type ToastType = "success" | "error"

let root: HTMLDivElement | null = null

function ensureRoot(): HTMLDivElement {
  if (root && document.body.contains(root)) {
    return root
  }
  root = document.createElement("div")
  root.className = "inbox-toast-root"
  document.body.appendChild(root)
  return root
}

export function showToast(message: string, type: ToastType = "success"): void {
  const host = ensureRoot()
  const toast = document.createElement("div")
  toast.className = `inbox-toast inbox-toast-${type}`
  toast.textContent = message
  host.appendChild(toast)

  fadeSlideIn(toast, { y: -8, duration: 0.2 })

  const remove = () => {
    fadeSlideOut(toast, {
      y: -6,
      duration: 0.14,
      onComplete: () => {
        if (host.contains(toast)) {
          host.removeChild(toast)
        }
      },
    })
  }

  window.setTimeout(remove, 2200)
}
