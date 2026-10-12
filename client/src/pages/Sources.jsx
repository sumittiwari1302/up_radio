import React from 'react'
import { ExternalLink } from 'lucide-react'

const SOURCES = [
  { label: 'asiawaves.net — frequencies', href: 'https://www.asiawaves.net/india/uttar-pradesh-radio.htm' },
  { label: 'codito/akashvani — streams', href: 'https://github.com/codito/akashvani' },
  { label: 'Akashvani — official', href: 'https://akashvani.gov.in' },
]

export default function Sources() {
  return (
    <section className="container sources-page" id="sources">
      <h1 className="section-title">
        Sources & Credits <span className="hi">/ स्रोत और श्रेय</span>
      </h1>

      <div className="sources__grid">
        <div className="sources__card">
          <h2>Data Sources</h2>
          <p className="sources__desc">
            UP Radio aggregates publicly available station information and stream URLs from the following sources.
            We do not host or re-encode any audio — all streams connect directly to the broadcasters' servers.
          </p>
          <ul className="sources__list">
            {SOURCES.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="sources__link">
                  {s.label} <ExternalLink size={14} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="sources__card">
          <h2>License & Attribution</h2>
          <ul className="sources__list sources__license">
            <li>
              <strong>Code & Design:</strong> MIT License —{' '}
              <a href="https://github.com/sumittiwari1302/up-radio" target="_blank" rel="noopener noreferrer">
                github.com/sumittiwari1302/up-radio <ExternalLink size={14} />
              </a>
            </li>
            <li>
              <strong>Frequency Data:</strong> Sourced from{' '}
              <a href="https://www.asiawaves.net/india/uttar-pradesh-radio.htm" target="_blank" rel="noopener noreferrer">
                asiawaves.net <ExternalLink size={14} />
              </a>
              {'(public reference)'}
            </li>
            <li>
              <strong>Stream URLs:</strong> Sourced from{' '}
              <a href="https://github.com/codito/akashvani" target="_blank" rel="noopener noreferrer">
                codito/akashvani <ExternalLink size={14} />
              </a>
              {'and public broadcaster websites'}
            </li>
            <li>
              <strong>Fonts:</strong>{' '}
              <a href="https://fonts.google.com/specimen/Inter" target="_blank" rel="noopener noreferrer">Inter</a>{' '},
              <a href="https://fonts.google.com/specimen/Noto+Sans+Devanagari" target="_blank" rel="noopener noreferrer">Noto Sans Devanagari</a>{' '},
              <a href="https://github.com/JetBrains/JetBrainsMono" target="_blank" rel="noopener noreferrer">JetBrains Mono</a>
            </li>
            <li>
              <strong>Icons:</strong>{' '}
              <a href="https://lucide.dev" target="_blank" rel="noopener noreferrer">Lucide</a>
            </li>
          </ul>
        </div>

        <div className="sources__card">
          <h2>Disclaimer</h2>
          <p className="sources__desc">
            Stream availability is not guaranteed. Broadcasters may change URLs, restrict by region, or take streams
            offline without notice. The online/offline indicator reflects the last successful reachability check
            from our server and may not match your local network conditions.
          </p>
          <p className="sources__desc">
            If you find incorrect information or a missing station, please{' '}
            <a href="#contact" className="sources__contact-link">contact us</a>.
          </p>
        </div>
      </div>
    </section>
  )
}