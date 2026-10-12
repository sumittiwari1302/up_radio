import React from 'react'
import { Square, Volume2, VolumeX, ChevronDown } from 'lucide-react'
import ModulationMonitor from './ModulationMonitor.jsx'
import { splitFrequency } from '../lib/frequency.js'

export default function StickyPlayer({
  nowPlaying,
  onStop,
  onExpand,
  analyserRef,
  volume,
  onVolume,
  muted,
  onToggleMute,
  onHide,
}) {
  if (!nowPlaying) return null
  const freq = splitFrequency(nowPlaying)

  return (
    <div className="player" role="region" aria-label="Now playing">
      <div className="player__inner container">
        <button className="player__info" onClick={onExpand} title="Open radio console">
          <span className="player__eq" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="player__text">
            <span className="player__name">{nowPlaying.name_en}</span>
            <span className="player__meta">
              {[nowPlaying.city, nowPlaying.frequency].filter(Boolean).join(' • ')}
            </span>
          </span>
        </button>

        <div className="player__freq mono">
          {freq.value}
          <em>{freq.unit}</em>
        </div>

        <div className="player__monitor">
          <ModulationMonitor analyserRef={analyserRef} active bars={28} />
        </div>

        <div className="player__vol">
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

        <button className="player__stop" onClick={onStop} aria-label="Stop">
          <Square size={15} />
        </button>
        <button className="player__hide" onClick={onHide} aria-label="Hide player">
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
  )
}
