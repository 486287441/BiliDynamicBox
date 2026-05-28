const HISTORY_EVENT_NAME = "bewly-history-change"

function injectFunction(origin, keys, callback) {
  const targets = Array.isArray(keys) ? keys : [keys]
  const originValues = targets.reduce((acc, key) => {
    acc[key] = origin[key]
    return acc
  }, {})

  targets.forEach((key) => {
    const wrapped = (...args) => {
      callback(...args)
      return originValues[key].apply(origin, args)
    }
    wrapped.toString = origin[key].toString.bind(origin[key])
    origin[key] = wrapped
  })
}

if (!window.__bewlyHistoryInjected) {
  injectFunction(window.history, ["pushState", "replaceState", "forward", "back"], () => {
    window.dispatchEvent(new CustomEvent(HISTORY_EVENT_NAME))
  })
  window.__bewlyHistoryInjected = true
}
