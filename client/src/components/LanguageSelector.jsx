import React from 'react'
import { Globe, ChevronDown, Check } from 'lucide-react'

export default function LanguageSelector({ lang, setLanguage, languages, t }) {
  const [open, setOpen] = React.useState(false)

  const currentLang = languages.find(l => l.code === lang) || languages[0]

  const handleSelect = (code) => {
    setLanguage(code)
    setOpen(false)
  }

  return (
    <div className="lang-selector">
      <button
        className="lang-btn"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select language"
      >
        <Globe size={16} />
        <span className="lang-code">{currentLang.code.toUpperCase()}</span>
        <ChevronDown size={12} className={open ? 'rotate-180' : ''} />
      </button>

      {open && (
        <ul className="lang-dropdown" role="listbox" aria-label="Languages">
          {languages.map(l => (
            <li key={l.code} role="option" aria-selected={l.code === lang}>
              <button
                className={`lang-option ${l.code === lang ? 'active' : ''}`}
                onClick={() => handleSelect(l.code)}
              >
                <span className="lang-native">{l.native}</span>
                <span className="lang-english">{l.name}</span>
                {l.code === lang && <Check size={14} className="check" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}