import React from 'react'
import { Radio, Square } from 'lucide-react'

export default function Hero({ nowPlaying, onStop }) {
  return (
    <section className="hero container">
      <div className="hero__inner">
        <div className="hero__badges">
          <span className={`chip chip--live ${nowPlaying ? 'is-on' : ''}`}>
            <Radio size={13} /> {nowPlaying ? 'NOW PLAYING' : 'STANDBY'}
          </span>
          <span className="chip">AKASHVANI • COMMUNITY • ONLINE • PRIVATE FM</span>
        </div>

        <h1 className="hero__title">
          UP Radio
          <span className="hero__hi">उत्तर प्रदेश रेडियो</span>
        </h1>

        {nowPlaying ? (
          <div className="hero__now">
            <div>
              <div className="hero__now-name">{nowPlaying.name_en}</div>
              {nowPlaying.name_hi && <div className="hero__now-hi">{nowPlaying.name_hi}</div>}
              <div className="hero__now-meta">
                {[nowPlaying.city, nowPlaying.frequency, nowPlaying.language].filter(Boolean).join(' • ')}
              </div>
            </div>
            <button className="btn btn--active" onClick={onStop}>
              <Square size={14} /> Stop
            </button>
          </div>
        ) : (
          <p className="hero__desc">
            Live directory of Uttar Pradesh radio streams — publicly sourced from broadcasters.
            Pick a station below to listen.
          </p>
        )}
      </div>
    </section>
  )
}
