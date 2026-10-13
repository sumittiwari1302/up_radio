import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Square, Volume2, VolumeX, Radio, Power } from 'lucide-react'
import ModulationMonitor from './ModulationMonitor.jsx'
import { splitFrequency } from '../lib/frequency.js'
import { useLanguage } from '../hooks/useLanguage.js'

export default function RadioConsole({
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
  const { t, lang } = useLanguage()
  const list = stations || []
  const playing = !!nowPlaying
  const currentIndex = useMemo(
    () => (nowPlaying ? list.findIndex((s) => s.id === nowPlaying.id) : -1),
    [list, nowPlaying]
  )
  const [dial, setDial] = useState(0)

  const getStationName = (station, lang) => {
    if (lang === 'hi' && station?.name_hi) return station.name_hi
    if (lang === 'bho' && station?.name_bho) return station.name_bho
    return station?.name_en
  }

  // Keep the dial in sync when a station is chosen elsewhere (card, deep link).
  useEffect(() => {
    if (currentIndex >= 0) setDial(currentIndex)
  }, [currentIndex])

  const tuneStation = useMemo(() => list[dial] || null, [list, dial])
  const readout = splitFrequency(tuneStation)

  const lastIndex = Math.max(0, list.length - 1)
  const pct = lastIndex ? (dial / lastIndex) * 100 : 0
  const commitRef = useRef(false)

  const commit = () => {
    const station = list[dial]
    if (station && station.id !== nowPlaying?.id) onPlay(station)
  }

  const idle = !playing

  const nowPlayingName = getStationName(nowPlaying, lang)
  const tuneStationName = getStationName(tuneStation, lang)

  return (
    <div className="console" data-playing={playing}>
      <div className="console__top">
        <div className="console__id">
          <span className="console__brandline">
            <Radio size={15} /> UP RADIO CONSOLE
          </span>
          {nowPlaying ? (
            <>
              <span className="console__name">{getStationName(nowPlaying, lang)}</span>
              <span className="console__meta">
                {[nowPlaying.city, nowPlaying.frequency, nowPlaying.language]
                  .filter(Boolean)
                  .join(' • ')}
              </span>
            </>
          ) : (
            <>
              <span className="console__name">{t('player.standby')}</span>
              <span className="console__meta">
                {t('player.tuneDial')}
              </span>
            </>
          )}
        </div>

        <div className="console__actions">
          {playing ? (
            <button className="console__power" onClick={onStop} aria-label={t('player.stop')}>
              <Square size={15} /> {t('player.stop')}
            </button>
          ) : (
            <button
              className="console__power console__power--on"
              onClick={() => list[dial] && onPlay(list[dial])}
              disabled={!list.length}
              aria-label="Power on"
            >
              <Power size={15} /> {t('player.power')}
            </button>
          )}
        </div>
      </div>

      <ModulationMonitor
        analyserRef={analyserRef}
        active={playing}
        label={playing ? t('player.onAir') : t('player.noSignal')}
      />

      <div className="console__controls">
        <div className="console__tuner">
          <div className="console__readout">
            <span className="console__readout-label">{t('player.frequency')}</span>
            <span className="console__readout-value mono">
              {readout.value}
              <em>{readout.unit}</em>
            </span>
            <span className="console__readout-station">{getStationName(tuneStation, lang) || '—'}</span>
          </div>

          <div className="dial">
            <div className="dial__scale">
              {list.map((s, i) => {
                const left = lastIndex ? (i / lastIndex) * 100 : 0
                const isCurrent = playing && s.id === nowPlaying.id
                const isTuned = i === dial
                return (
                  <span
                    key={s.id}
                    className={`dial__tick ${isCurrent ? 'is-current' : ''} ${
                      isTuned ? 'is-tuned' : ''
                    }`}
                    style={{ left: `${left}%` }}
                  />
                )
              })}
              <div className="dial__needle" style={{ left: `${pct}%` }} />
            </div>
            <input
              className="dial__input"
              type="range"
              min={0}
              max={lastIndex}
              step={1}
              value={dial}
              onChange={(e) => {
                setDial(Number(e.target.value))
                commitRef.current = true
              }}
              onPointerUp={() => {
                if (commitRef.current) commit()
                commitRef.current = false
              }}
              onKeyUp={(e) => {
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) commit()
              }}
              aria-label="Frequency tuner"
              disabled={!list.length}
            />
            <div className="dial__ends">
              <span>{list.length ? splitFrequency(list[0]).value : '—'}</span>
              <span>{list.length ? splitFrequency(list[lastIndex]).value : '—'}</span>
            </div>
          </div>
        </div>

        <div className="console__volume">
          <div className="console__readout">
            <span className="console__readout-label">{t('player.volume')}</span>
            <span className="console__readout-value mono">{Math.round((muted ? 0 : volume) * 100)}%</span>
          </div>
          <div className="vol">
            <button className="vol__mute" onClick={onToggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              className="vol__input"
              type="range"
              min={0}
              max={100}
              value={Math.round((muted ? 0 : volume) * 100)}
              style={{ '--vol-fill': `${Math.round((muted ? 0 : volume) * 100)}%` }}
              onChange={(e) => onVolume(Number(e.target.value) / 100)}
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  )
}