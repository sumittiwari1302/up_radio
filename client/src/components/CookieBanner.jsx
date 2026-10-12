import React, { useState } from 'react'
import { Cookie } from 'lucide-react'

const KEY = 'up-radio:cookieConsent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    return !localStorage.getItem(KEY)
  })

  if (!visible) return null

  const decide = (value) => {
    localStorage.setItem(KEY, value)
    setVisible(false)
  }

  return (
    <div className="cookie" role="dialog" aria-live="polite" aria-label="Cookie notice">
      <div className="cookie__inner">
        <Cookie size={18} className="cookie__icon" />
        <p>
          We use local storage for your playback preferences and, only with your consent,
          anonymous analytics. No third-party tracking.{' '}
          <a href="/privacy">Privacy Policy</a>
        </p>
        <div className="cookie__actions">
          <button className="btn btn--ghost" onClick={() => decide('rejected')}>
            Reject
          </button>
          <button className="btn btn--primary" onClick={() => decide('accepted')}>
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
