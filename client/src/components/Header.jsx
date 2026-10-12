import React from 'react'
import { Radio, Menu, Link } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import ThemeToggle from './ThemeToggle.jsx'

export default function Header({ connected, presence, catalog, theme, onToggleTheme, onOpenMenu, navLinks }) {
  const counts = catalog?.counts
  const playable = counts?.playable ?? '—'

  return (
    <header className="header" id="top">
      <div className="container header__row">
        <RouterLink className="brand" to="/" aria-label="UP Radio home">
          <span className="brand__mark">UP</span>
          <span className="brand__text">
            <span className="brand__en">UTTAR PRADESH RADIO</span>
            <span className="brand__hi">उत्तर प्रदेश रेडियो</span>
          </span>
        </RouterLink>

        <div className="header__center">
          <nav className="nav" aria-label="Primary">
            {navLinks?.map((link) => (
              <RouterLink key={link.path} to={link.path} className="nav__link">
                {link.label}
              </RouterLink>
            ))}
          </nav>
        </div>

        <div className="header__right">
          <span className={`chip chip--conn ${connected}`}>
            <span className="conn-dot" />
            {connected === 'live' ? 'LIVE' : connected === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
          </span>
          <span className="chip chip--streams" title="Stations with a live stream">
            <Radio size={13} />
            <b className="mono">{playable}</b>
            <span className="chip__key">STREAMS</span>
          </span>
          <span className="chip chip--air" title="Listeners connected now">
            <span className="chip__key">ON AIR</span>
            <b className="mono">{presence?.listeners ?? 0}</b>
          </span>

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />

          <button className="header__burger" onClick={onOpenMenu} aria-label="Open menu">
            <Menu size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
