import React from 'react'

export default function Footer({ catalog }) {
  const counts = catalog?.counts
  const updated = catalog?.updated_at
    ? new Date(catalog.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : '—'

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <span className="brand__mark">UP</span>
          <p>
            Live directory of free radio stations in Uttar Pradesh — Akashvani, community, campus,
            online and commercial FM.
          </p>
        </div>

        <div>
          <h3>CATALOG</h3>
          <p className="footer__stat">
            <b className="mono">{counts?.total ?? '—'}</b> stations
          </p>
          <p className="footer__stat">
            <b className="mono">{counts?.playable ?? '—'}</b> playable
          </p>
          <p className="footer__updated mono">Updated: {updated}</p>
        </div>

        <div>
          <h3>SOURCES</h3>
          <ul className="footer__links">
            <li>
              <a href="https://www.asiawaves.net/india/uttar-pradesh-radio.htm" target="_blank" rel="noopener">
                asiawaves.net
              </a>
            </li>
            <li>
              <a href="https://github.com/codito/akashvani" target="_blank" rel="noopener">
                codito/akashvani
              </a>
            </li>
            <li>
              <a href="https://onlineradiofm.in/uttar-pradesh" target="_blank" rel="noopener">
                onlineradiofm.in
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="container footer__bar">
        <span>© {new Date().getFullYear()} UP Radio · Independent project, not affiliated with Prasar Bharati.</span>
        <span>Audio is streamed from broadcasters’ public players and is not hosted here.</span>
      </div>
    </footer>
  )
}
