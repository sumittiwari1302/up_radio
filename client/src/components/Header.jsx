import React from 'react'

export default function Header({ connected, presence, catalog }) {
  const counts = catalog?.counts
  const playable = counts?.playable ?? '—'
  const total = counts?.total ?? '—'

  return (
    <header className="header">
      <div className="container header__row">
        <a className="brand" href="#top">
          <span className="brand__mark">UP</span>
          <span className="brand__text">
            <span className="brand__en">UTTAR PRADESH RADIO</span>
            <span className="brand__hi">उत्तर प्रदेश रेडियो</span>
          </span>
        </a>

        <div className="header__stats">
          <span className={`chip chip--conn ${connected}`}>
            <span className="conn-dot" /> {connected.toUpperCase()}
          </span>
          <span className="chip">
            <span className="chip__key">STREAMS</span>
            <b className="mono">{playable}</b>
          </span>
          <span className="chip">
            <span className="chip__key">TOTAL</span>
            <b className="mono">{total}</b>
          </span>
          <span className="chip">
            <span className="chip__key">ON AIR</span>
            <b className="mono">{presence?.listeners ?? 0}</b>
          </span>
        </div>
      </div>
    </header>
  )
}
