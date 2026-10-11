import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import ThemeToggle from './ThemeToggle.jsx'

const LINKS = [
  { href: '#channels', label: 'Channels' },
  { href: '#faq', label: 'FAQ' },
  { href: '#footer', label: 'Sources' },
  { href: '#contact', label: 'Contact' },
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
            <a key={l.href} href={l.href} className="drawer__link" onClick={onClose}>
              {l.label}
            </a>
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
