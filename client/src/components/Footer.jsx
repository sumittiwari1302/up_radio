import React from 'react'
import { ExternalLink, Mail, MessageSquare, Link } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage.js'

const SOURCES = [
  { label: 'asiawaves.net - frequencies', href: 'https://www.asiawaves.net/india/uttar-pradesh-radio.htm' },
  { label: 'codito/akashvani - streams', href: 'https://github.com/codito/akashvani' },
  { label: 'Akashvani - official', href: 'https://akashvani.gov.in' },
]

const EMAIL = 'sumittiwari0307@gmail.com'
const GITHUB = 'https://github.com/sumittiwari1302'
const LINKEDIN = 'https://www.linkedin.com/in/sumit-tiwari-b18701380/'

export default function Footer({ catalog, onContact }) {
  const { t } = useLanguage()
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
          <RouterLink className="brand" to="/" aria-label={t('brand.uttarPradeshRadio')}>
            <span className="brand__mark">UP</span>
            <span className="brand__text">
              <span className="brand__en">{t('brand.uttarPradeshRadio')}</span>
              <span className="brand__hi">{t('brand.uttarPradeshRadioHi')}</span>
            </span>
          </RouterLink>
          <p>
            {t('footer.description')}
          </p>
          <dl className="footer__stats">
            <div><dt>{t('footer.totalStations')}</dt><dd className="mono">{counts?.total ?? '-'}</dd></div>
            <div><dt>{t('footer.playableNow')}</dt><dd className="mono">{counts?.playable ?? '-'}</dd></div>
          </dl>
          <p className="footer__updated mono">{t('footer.updated')} {updated} IST</p>
        </div>

        <div className="footer__col">
          <h3>{t('footer.explore')}</h3>
          <ul className="footer__links">
            <li><RouterLink to="/channels">{t('footer.channelDirectory')}</RouterLink></li>
            <li><RouterLink to="/faq">{t('nav.faq')}</RouterLink></li>
            <li><a href="#top">{t('footer.backToTop')}</a></li>
            <li>
              <a href="https://github.com/sumittiwari1302" target="_blank" rel="noopener noreferrer">
                GitHub <ExternalLink size={12} />
              </a>
            </li>
          </ul>
        </div>

        <div className="footer__col">
          <h3>{t('footer.legal')}</h3>
          <ul className="footer__links">
            <li><a href="/privacy">{t('footer.privacy')}</a></li>
            <li><a href="/terms">{t('footer.terms')}</a></li>
            <li><RouterLink to="/sources">{t('footer.sources')}</RouterLink></li>
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
          <h3>{t('footer.contact')}</h3>
          <ul className="footer__links">
            <li>
              <a href={`mailto:${EMAIL}`}>
                <Mail size={14} /> {EMAIL}
              </a>
            </li>
            <li>
              <a href="https://www.linkedin.com/in/sumit-tiwari-b18701380/" target="_blank" rel="noopener noreferrer">
                <Link size={14} /> linkedin.com/in/sumit-tiwari-b18701380
              </a>
            </li>
            <li>
              <button type="button" className="footer__linkbtn" onClick={onContact}>
                <MessageSquare size={14} /> {t('contact.message')}
              </button>
            </li>
            <li>
              <a href="https://github.com/sumittiwari1302" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> github.com/sumittiwari1302
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="container footer__bar">
        <span>{t('footer.rights', { year })}</span>
        <span className="footer__bar-links">
          <a href="/privacy">{t('footer.privacy')}</a>
          <a href="/terms">{t('footer.terms')}</a>
          <a href={`mailto:sumittiwari0307@gmail.com`}>{t('contact.email')}</a>
          <a href="https://www.linkedin.com/in/sumit-tiwari-b18701380/" target="_blank" rel="noopener noreferrer">
            <Link size={12} /> LinkedIn
          </a>
        </span>
      </div>
    </footer>
  )
}