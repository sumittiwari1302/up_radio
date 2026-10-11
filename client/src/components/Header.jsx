import React from 'react'
import { Radio } from 'lucide-react'

export default function Header({ connected, presence, catalog }) {
  const counts = catalog?.counts
  const playable = counts?.playable ?? '—'

  return (
    <header className="header" id="top">
      <div className="container header__row">
        <a className="brand" href="#top">
          <span className="brand__mark">UP</span>
          <span className="brand__text">
            <span className="brand__en">UTTAR PRADESH RADIO</span>
            <span className="brand__hi">उत्तर प्रदेश रेडियो</span>
          </span>
        </a>

        <div className="header__center">
          <nav className="nav" aria-label="Primary">
            <a href="#channels" className="nav__link">Channels</a>
            <a href="#footer" className="nav__link">Sources</a>
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
        </div>
      </div>
    </header>
  )
}