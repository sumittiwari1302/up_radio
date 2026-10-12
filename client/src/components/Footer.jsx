import React from 'react'
import { ExternalLink, Mail, MessageSquare } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'

const SOURCES = [
  { label: 'asiawaves.net - frequencies', href: 'https://www.asiawaves.net/india/uttar-pradesh-radio.htm' },
  { label: 'codito/akashvani - streams', href: 'https://github.com/codito/akashvani' },
  { label: 'Akashvani - official', href: 'https://akashvani.gov.in' },
]

const EMAIL = 'sumittiwari1302@gmail.com'
const GITHUB = 'https://github.com/sumittiwari1302'

export default function Footer({ catalog, onContact }) {
  const counts = catalog?.counts
  const updated = catalog?.updated_at
    ? new Date(catalog.updated_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '-'
  const year = new Date().getFullYear()

  return (
    <footer className="footer" id="footer">
      <div className="container footer__grid">
        <div className="footer__col footer__brand">
          <RouterLink className="brand" to="/" aria-label="UP Radio home">
            <span className="brand__mark">UP</span>
            <span className="brand__text">
              <span className="brand__en">UTTAR PRADESH RADIO</span>
              <span className="brand__hi">उत्तर प्रदेश रेडियो</span>
            </span>
          </RouterLink>
          <p>
            A live directory of every free radio station in Uttar Pradesh - Akashvani,
            community and campus radio, online stations and commercial FM.
          </p>
          <dl className="footer__stats">
            <div><dt>Total stations</dt><dd className="mono">{counts?.total ?? '-'}</dd></div>
            <div><dt>Playable now</dt><dd className="mono">{counts?.playable ?? '-'}</dd></div>
          </dl>
          <p className="footer__updated mono">Updated {updated} IST</p>
        </div>

        <div className="footer__col">
          <h3>Explore</h3>
          <ul className="footer__links">
            <li><RouterLink to="/channels">Channel directory</RouterLink></li>
            <li><RouterLink to="/faq">FAQ</RouterLink></li>
            <li><a href="#top">Back to top</a></li>
            <li>
              <a href={GITHUB} target="_blank" rel="noopener noreferrer">
                GitHub <ExternalLink size={12} />
              </a>
            </li>
          </ul>
        </div>

        <div className="footer__col">
          <h3>Legal & sources</h3>
          <ul className="footer__links">
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/terms">Terms & Conditions</a></li>
            <li><RouterLink to="/sources">Sources & Credits</RouterLink></li>
            {SOURCES.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer">
                  {s.label} <ExternalLink size={12} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__col" id="contact">
          <h3>Contact</h3>
          <ul className="footer__links">
            <li>
              <a href={`mailto:${EMAIL}`}>
                <Mail size={14} /> {EMAIL}
              </a>
            </li>
            <li>
              <button type="button" className="footer__linkbtn" onClick={onContact}>
                <MessageSquare size={14} /> Send a message
              </button>
            </li>
            <li>
              <a href={GITHUB} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> github.com/sumittiwari1302
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="container footer__bar">
        <span>© {year} UP Radio · MIT License · Sumit Tiwari</span>
        <span className="footer__bar-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href={`mailto:${EMAIL}`}>Email</a>
        </span>
      </div>
    </footer>
  )
}