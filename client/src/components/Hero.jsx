import React from 'react'
import { Play } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import RadioConsole from './RadioConsole.jsx'

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
  return (
    <section className="hero container">
      <div className="hero__inner">
        <h1 className="hero__title">
          UP Radio
          <span className="hero__hi">उत्तर प्रदेश रेडियो</span>
        </h1>

        <p className="hero__desc">
          Listen to 54 live Akashvani, community and FM radio stations from Uttar Pradesh.
          No sign-up required.
        </p>

        <div className="hero__cta">
          <RouterLink className="btn btn--primary btn--lg" to="/channels">
            <Play size={16} /> Browse all stations
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
