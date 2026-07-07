import gsap from "gsap"

const BASE = { force3D: true, overwrite: "auto" as const }

export function motionEnabled(): boolean {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function fadeSlideIn(
  target: gsap.TweenTarget,
  options?: { y?: number; duration?: number; delay?: number; onComplete?: () => void },
): gsap.core.Tween {
  const { y = 10, duration = 0.22, delay = 0, onComplete } = options ?? {}
  if (!motionEnabled()) {
    return gsap.set(target, { autoAlpha: 1, y: 0, scale: 1, clearProps: "transform" })
  }
  return gsap.fromTo(
    target,
    { autoAlpha: 0, y, scale: 0.98 },
    { autoAlpha: 1, y: 0, scale: 1, duration, delay, ease: "power2.out", onComplete, ...BASE },
  )
}

export function fadeSlideOut(
  target: gsap.TweenTarget,
  options?: { y?: number; duration?: number; onComplete?: () => void },
): gsap.core.Tween {
  const { y = -8, duration = 0.16, onComplete } = options ?? {}
  if (!motionEnabled()) {
    onComplete?.()
    return gsap.set(target, { autoAlpha: 0 })
  }
  return gsap.to(target, { autoAlpha: 0, y, scale: 0.96, duration, ease: "power2.in", onComplete, ...BASE })
}

export function scaleFadeIn(
  target: gsap.TweenTarget,
  options?: { duration?: number; onComplete?: () => void },
): gsap.core.Tween {
  const { duration = 0.2, onComplete } = options ?? {}
  if (!motionEnabled()) {
    return gsap.set(target, { autoAlpha: 1, scale: 1, clearProps: "transform" })
  }
  return gsap.fromTo(
    target,
    { autoAlpha: 0, scale: 0.96 },
    { autoAlpha: 1, scale: 1, duration, ease: "power2.out", onComplete, ...BASE },
  )
}

export function scaleFadeOut(
  target: gsap.TweenTarget,
  options?: { duration?: number; onComplete?: () => void },
): gsap.core.Tween {
  const { duration = 0.16, onComplete } = options ?? {}
  if (!motionEnabled()) {
    onComplete?.()
    return gsap.set(target, { autoAlpha: 0 })
  }
  return gsap.to(target, { autoAlpha: 0, scale: 0.96, duration, ease: "power2.in", onComplete, ...BASE })
}

export function staggerIn(
  targets: gsap.TweenTarget,
  options?: { y?: number; stagger?: number; duration?: number; maxItems?: number },
): gsap.core.Tween {
  const { y = 10, stagger = 0.03, duration = 0.24, maxItems = 10 } = options ?? {}
  const items = gsap.utils.toArray(targets)
  if (items.length === 0) {
    return gsap.set([])
  }
  if (!motionEnabled()) {
    return gsap.set(items, { autoAlpha: 1, y: 0, scale: 1, clearProps: "transform" })
  }
  const animated = items.slice(0, maxItems)
  if (items.length > maxItems) {
    gsap.set(items.slice(maxItems), { autoAlpha: 1, y: 0, scale: 1, clearProps: "transform" })
  }
  return gsap.fromTo(
    animated,
    { autoAlpha: 0, y, scale: 0.98 },
    { autoAlpha: 1, y: 0, scale: 1, duration, stagger, ease: "power2.out", ...BASE },
  )
}

export type CardLeaveVariant = "dislike" | "want-watch" | "default"

const CARD_LEAVE_VARIANTS: Record<
  CardLeaveVariant,
  { x: number; y: number; scale: number; rotation: number; duration: number; ease: string }
> = {
  dislike: { x: 12, y: 6, scale: 0.92, rotation: 2, duration: 0.3, ease: "power2.in" },
  "want-watch": { x: 0, y: -10, scale: 0.94, rotation: 0, duration: 0.28, ease: "power2.inOut" },
  default: { x: 8, y: -4, scale: 0.93, rotation: 0, duration: 0.24, ease: "power2.in" },
}

export function captureCardRects(
  container: HTMLElement,
  exclude?: HTMLElement,
): Map<HTMLElement, DOMRect> {
  const rects = new Map<HTMLElement, DOMRect>()
  container.querySelectorAll<HTMLElement>(".video-card").forEach((el) => {
    if (exclude && el === exclude) {
      return
    }
    rects.set(el, el.getBoundingClientRect())
  })
  return rects
}

export function animateGridReflow(
  container: HTMLElement,
  beforeRects: Map<HTMLElement, DOMRect>,
  onComplete?: () => void,
): void {
  if (!motionEnabled() || beforeRects.size === 0) {
    onComplete?.()
    return
  }

  const timeline = gsap.timeline({ onComplete })
  let hasTween = false

  beforeRects.forEach((oldRect, el) => {
    if (!container.contains(el)) {
      return
    }
    const newRect = el.getBoundingClientRect()
    const dx = oldRect.left - newRect.left
    const dy = oldRect.top - newRect.top
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      return
    }
    hasTween = true
    timeline.fromTo(
      el,
      { x: dx, y: dy },
      { x: 0, y: 0, duration: 0.32, ease: "power2.out", clearProps: "transform", ...BASE },
      0,
    )
  })

  if (!hasTween) {
    onComplete?.()
  }
}

export function prepareCardLeave(el: HTMLElement): void {
  el.classList.add("video-card--leaving")
  el.style.willChange = "transform, opacity"
  el.style.pointerEvents = "none"
}

export function cardLeave(
  el: Element,
  done: () => void,
  variant: CardLeaveVariant = "default",
): void {
  if (!motionEnabled()) {
    done()
    return
  }
  const htmlEl = el as HTMLElement
  const config = CARD_LEAVE_VARIANTS[variant]
  gsap.to(htmlEl, {
    autoAlpha: 0,
    x: config.x,
    y: config.y,
    scale: config.scale,
    rotation: config.rotation,
    duration: config.duration,
    ease: config.ease,
    onComplete: done,
    ...BASE,
  })
}

export function resetCardLeaveStyles(el: HTMLElement): void {
  el.classList.remove("video-card--leaving")
  el.style.willChange = ""
  el.style.pointerEvents = ""
  gsap.set(el, { clearProps: "all" })
}

export function pulseActive(target: gsap.TweenTarget): void {
  if (!motionEnabled()) {
    return
  }
  gsap.fromTo(
    target,
    { scale: 1 },
    { scale: 1.03, duration: 0.1, yoyo: true, repeat: 1, ease: "power1.out", ...BASE },
  )
}

export function maskFadeIn(
  target: gsap.TweenTarget,
  options?: { duration?: number; onComplete?: () => void },
): gsap.core.Tween {
  const { duration = 0.18, onComplete } = options ?? {}
  if (!motionEnabled()) {
    return gsap.set(target, { autoAlpha: 1 })
  }
  return gsap.fromTo(target, { autoAlpha: 0 }, { autoAlpha: 1, duration, ease: "power1.out", onComplete, ...BASE })
}

export function maskFadeOut(
  target: gsap.TweenTarget,
  options?: { duration?: number; onComplete?: () => void },
): gsap.core.Tween {
  const { duration = 0.16, onComplete } = options ?? {}
  if (!motionEnabled()) {
    onComplete?.()
    return gsap.set(target, { autoAlpha: 0 })
  }
  return gsap.to(target, { autoAlpha: 0, duration, ease: "power1.in", onComplete, ...BASE })
}
