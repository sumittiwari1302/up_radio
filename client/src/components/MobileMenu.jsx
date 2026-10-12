import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import ThemeToggle from './ThemeToggle.jsx'

const LINKS = [
  { to: '/channels', label: 'Channels' },
  { to: '/faq', label: 'FAQ' },
  { to: '/sources', label: 'Sources' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
]

export default function MobileMenu({ open, onClose, theme, onToggleTheme }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <>
      <div className={`drawer__backdrop ${open ? 'is-open' : ''}`} onClick={onClose} />
      <aside className={`drawer ${open ? 'is-open' : ''}`} aria-hidden={!open} aria-label="Menu">
        <div className="drawer__head">
          <span className="brand__mark">UP</span>
          <button className="btn btn--ghost" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="drawer__nav">
          {LINKS.map((l) => (
            <RouterLink key={l.to || l.href} to={l.to || l.href} className="drawer__link" onClick={onClose}>
              {l.label}
            </RouterLink>
          ))}
        </nav>

        <div className="drawer__foot">
          <span>Appearance</span>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </aside>
    </>
  )
}
