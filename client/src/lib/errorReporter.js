let sent = 0
let lastAt = 0

function report(payload) {
  if (typeof window === 'undefined') return
  const now = Date.now()
  // Never spam the endpoint: at most 10 reports, one per 2s.
  if (sent >= 10 || now - lastAt < 2000) return
  sent++
  lastAt = now
  try {
    const body = JSON.stringify({
      url: location.pathname + location.search,
      source: 'client',
      ...payload,
    })
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/errors', new Blob([body], { type: 'application/json' }))
    } else {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    /* monitoring must never throw */
  }
}

export function installErrorMonitoring() {
  if (typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    // Ignore failed subresource loads (images/audio) — they are noisy and benign.
    if (event.target && event.target !== window) return
    report({
      message: event.message || 'Unknown error',
      stack: event.error?.stack || '',
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    report({
      message: typeof reason === 'string' ? reason : reason?.message || 'Unhandled promise rejection',
      stack: reason?.stack || '',
    })
  })
}
