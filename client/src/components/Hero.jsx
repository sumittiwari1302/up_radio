import React from 'react'
import { Play } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import RadioConsole from './RadioConsole.jsx'
import { useLanguage } from '../hooks/useLanguage.js'

export default function Hero({
  stations,
  nowPlaying,
  onPlay,
  onStop,
  analyserRef,
  volume,
  onVolume,
  muted,
  onToggleMute,
}) {
  const { t } = useLanguage()

  return (
    <section className="hero container">
      <div className="hero__inner">
        <h1 className="hero__title">
          {t('hero.title')}
          <span className="hero__hi">{t('hero.subtitle')}</span>
        </h1>

        <p className="hero__desc">
          {t('hero.desc')}
        </p>

        <div className="hero__cta">
          <RouterLink className="btn btn--primary btn--lg" to="/channels">
            <Play size={16} /> {t('hero.browse')}
          </RouterLink>
        </div>

        <RadioConsole
          stations={stations}
          nowPlaying={nowPlaying}
          onPlay={onPlay}
          onStop={onStop}
          analyserRef={analyserRef}
          volume={volume}
          onVolume={onVolume}
          muted={muted}
          onToggleMute={onToggleMute}
        />
      </div>
    </section>
  )
}
