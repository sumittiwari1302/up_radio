import React from 'react'
import { ExternalLink } from 'lucide-react'

const SOURCES = [
  { label: 'asiawaves.net — frequencies', href: 'https://www.asiawaves.net/india/uttar-pradesh-radio.htm' },
  { label: 'codito/akashvani — streams', href: 'https://github.com/codito/akashvani' },
  { label: 'onlineradiofm.in — online stations', href: 'https://onlineradiofm.in/uttar-pradesh' },
]

export default function Footer({ catalog }) {
  const counts = catalog?.counts
  const updated = catalog?.updated_at
    ? new Date(catalog.updated_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—'

  return (
    <footer className="footer" id="footer">
      <div className="container footer__grid">
        <div className="footer__col footer__brand">
          <div className="brand">
            <span className="brand__mark">UP</span>
            <span className="brand__text">
              <span className="brand__en">UTTAR PRADESH RADIO</span>
              <span className="brand__hi">उत्तर प्रदेश रेडियो</span>
            </span>
          </div>
          <p>
            A live directory of every free radio station in Uttar Pradesh — Akashvani,
            community and campus radio, online stations and commercial FM.
          </p>
        </div>

        <div className="footer__col">
          <h3>Navigate</h3>
          <ul className="footer__links">
            <li><a href="#channels">Channel directory</a></li>
            <li><a href="#top">Back to top</a></li>
            <li>
              <a href="https://github.com/sumittiwari1302/up_radio" target="_blank" rel="noopener">
                GitHub repository <ExternalLink size={12} />
              </a>
            </li>
          </ul>
        </div>

        <div className="footer__col">
          <h3>Catalog</h3>
          <dl className="footer__stats">
            <div><dt>Total</dt><dd className="mono">{counts?.total ?? '—'}</dd></div>
            <div><dt>Playable</dt><dd className="mono">{counts?.playable ?? '—'}</dd></div>
          </dl>
          <p className="footer__updated mono">Updated {updated} IST</p>
        </div>

        <div className="footer__col">
          <h3>Sources</h3>
          <ul className="footer__links">
            {SOURCES.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener">
                  {s.label} <ExternalLink size={12} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container footer__bar">
        <span>© {new Date().getFullYear()} UP Radio · MIT Licensed</span>
        <span>Not affiliated with Prasar Bharati. Audio is streamed from broadcasters’ public players.</span>
      </div>
    </footer>
  )
}