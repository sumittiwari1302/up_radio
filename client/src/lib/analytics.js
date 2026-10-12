const CONSENT_KEY = 'up-radio:cookieConsent'
const API_BASE = import.meta.env.PROD
  ? 'https://up-radio-api.YOUR_SUBDOMAIN.workers.dev'
  : '';

function hasConsent() {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(CONSENT_KEY) === 'accepted'
  } catch {
    return false
  }
}

/**
 * Consent-gated analytics. Events are only sent when the visitor accepted the
 * cookie banner; nothing is collected otherwise.
 */
export function track(type, data = {}) {
  if (typeof window === 'undefined') return
  if (!hasConsent()) return
  try {
    const body = JSON.stringify({ type, ...data, ts: Date.now() })
    const url = `${API_BASE}/api/analytics/event`
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    /* analytics must never break the app */
  }
}

export function hasAnalyticsConsent() {
  return hasConsent()
}
