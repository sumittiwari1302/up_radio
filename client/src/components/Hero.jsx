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
  loading,
  error,
}) {
  const { t } = useLanguage()

  if (loading) {
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

          <div className="console" data-playing="false">
            <div className="console__top">
              <div className="console__id">
                <span className="console__brandline">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9C8.8 1 15.2 1 19.1 4.9C22.9 8.8 22.9 15.2 19.1 19.1C15.2 22.9 8.8 22.9 4.9 19.1Z"/><path d="M9 9V13"/><path d="M15 9V13"/></svg> UP RADIO CONSOLE
                </span>
                <span className="console__name">{t('player.standby')}</span>
                <span className="console__meta">
                  {t('player.loadingStations')}
                </span>
              </div>
            </div>
            <div className="monitor" style={{ height: '68px' }}>
              <div className="monitor__caption">
                <span className="monitor__status">{t('player.connecting')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (error) {
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

          <div className="empty" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--text-dim)' }}>{t('error.loadFailed')}</p>
          </div>
        </div>
      </section>
    )
  }

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

        {stations.length > 0 && (
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
        )}
      </div>
    </section>
  )
}
