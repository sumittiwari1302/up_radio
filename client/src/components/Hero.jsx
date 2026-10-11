import React from 'react'
import { Square, Radio } from 'lucide-react'

export default function Hero({ nowPlaying, onStop }) {
  return (
    <section className="hero container">
      <div className="hero__inner">
        <h1 className="hero__title">
          UP Radio
          <span className="hero__hi">उत्तर प्रदेश रेडियो</span>
        </h1>

        <p className="hero__desc">
          Live directory of Uttar Pradesh radio streams — Akashvani, community, campus,
          online and commercial FM. Pick a station below to listen.
        </p>

        {nowPlaying && (
          <div className="hero__now">
            <Radio size={18} />
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
        )}
      </div>
    </section>
  )
}