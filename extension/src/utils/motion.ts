import gsap from "gsap"

const BASE = { force3D: true, overwrite: "auto" as const }

export function motionEnabled(): boolean {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function fadeSlideIn(
  target: gsap.TweenTarget,
  options?: { y?: number; duration?: number; delay?: number; onComplete?: () => void },
): gsap.core.Tween {
  const { y = 8, duration = 0.28, delay = 0, onComplete } = options ?? {}
  if (!motionEnabled()) {
    return gsap.set(target, { autoAlpha: 1, y: 0, scale: 1, clearProps: "transform" })
  }
  return gsap.fromTo(
    target,
    { autoAlpha: 0, y, scale: 0.99 },
    { autoAlpha: 1, y: 0, scale: 1, duration, delay, ease: "expo.out", onComplete, ...BASE },
  )
}

export function fadeSlideOut(
  target: gsap.TweenTarget,
  options?: { y?: number; duration?: number; onComplete?: () => void },
): gsap.core.Tween {
  const { y = -4, duration = 0.16, onComplete } = options ?? {}
  if (!motionEnabled()) {
    onComplete?.()
    return gsap.set(target, { autoAlpha: 0 })
  }
  return gsap.to(target, { autoAlpha: 0, y, scale: 0.99, duration, ease: "power2.in", onComplete, ...BASE })
}

export function scaleFadeIn(
  target: gsap.TweenTarget,
  options?: { duration?: number; onComplete?: () => void },
): gsap.core.Tween {
  const { duration = 0.28, onComplete } = options ?? {}
  if (!motionEnabled()) {
    return gsap.set(target, { autoAlpha: 1, scale: 1, clearProps: "transform" })
  }
  return gsap.fromTo(
    target,
    { autoAlpha: 0, scale: 0.985 },
    { autoAlpha: 1, scale: 1, duration, ease: "expo.out", onComplete, ...BASE },
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
  return gsap.to(target, { autoAlpha: 0, scale: 0.985, duration, ease: "power2.in", onComplete, ...BASE })
}

export function staggerIn(
  targets: gsap.TweenTarget,
  options?: { y?: number; stagger?: number; duration?: number; maxItems?: number },
): gsap.core.Tween {
  const { y = 8, stagger = 0.025, duration = 0.28, maxItems = 8 } = options ?? {}
  const items = gsap.utils.toArray(targets)
  if (items.length === 0) {
    return gsap.set([], {})
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
    { autoAlpha: 0, y, scale: 0.99 },
    { autoAlpha: 1, y: 0, scale: 1, duration, stagger, ease: "expo.out", ...BASE },
  )
}

export type CardLeaveVariant = "dislike" | "want-watch" | "default"

export function captureCardRects(
  container: HTMLElement,
  exclude?: HTMLElement,
): Map<HTMLElement, DOMRect> {
  const rects = new Map<HTMLElement, DOMRect>()
  container.querySelectorAll<HTMLElement>(".video-card").forEach((el) => {
    if (exclude && el === exclude) {
      return
    }
    const rect = el.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return
    // Animating off-screen cards wastes compositor work and is the main source
    // of jank on long inbox pages.
    if (rect.bottom < -40 || rect.top > window.innerHeight + 40) return
    if (rects.size >= 12) return
    rects.set(el, rect)
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

  const timeline = gsap.timeline({
    onComplete: () => {
      beforeRects.forEach((_rect, el) => el.classList.remove("is-flip-animating"))
      onComplete?.()
    },
  })
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
    el.classList.add("is-flip-animating")
    timeline.fromTo(
      el,
      { x: dx, y: dy, willChange: "transform" },
      {
        x: 0,
        y: 0,
        duration: 0.24,
        ease: "power3.out",
        clearProps: "transform,willChange",
        onComplete: () => el.classList.remove("is-flip-animating"),
        ...BASE,
      },
      0,
    )
  })

  if (!hasTween) {
    onComplete?.()
  }
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
  gsap.fromTo(target, { scale: 0.985 }, { scale: 1, duration: 0.16, ease: "expo.out", ...BASE })
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
