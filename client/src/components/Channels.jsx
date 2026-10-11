import React, { useMemo, useState } from 'react'
import { Play, Square, Search, Copy, Check, RotateCw } from 'lucide-react'

const FILTERS = [
  { id: 'all', label: 'ALL' },
  { id: 'playable', label: 'PLAYABLE' },
  { id: 'air', label: 'AKASHVANI' },
  { id: 'community', label: 'COMMUNITY' },
  { id: 'gyanvani', label: 'GYANVANI' },
  { id: 'online', label: 'ONLINE' },
  { id: 'private', label: 'PRIVATE FM' },
]

function useAllChannels(catalog) {
  return useMemo(() => {
    const groups = catalog?.station_dashboard?.groups || []
    return groups.flatMap((g) =>
      (g.channels || []).map((c) => ({ ...c, group: g.group_name }))
    )
  }, [catalog])
}

function StationCard({ station, status, isPlaying, onPlay, onStop }) {
  const [copied, setCopied] = useState(false)
  const st = status?.[station.id]
  const online = st?.online

  const copy = () => {
    const url = `${location.origin}/?stationId=${encodeURIComponent(station.id)}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <article className="card" data-playing={isPlaying}>
      <div className="card__head">
        <div className="card__titles">
          <span className="card__name">{station.name_en}</span>
          {station.name_hi && <span className="card__hi">{station.name_hi}</span>}
        </div>
        <span className="card__badge">{station.cat_label?.split(' / ')[0] || station.category}</span>
      </div>

      <div className="card__meta">
        {station.city && <span>{station.city}</span>}
        {station.frequency && <span className="mono">{station.frequency}</span>}
        {station.language && <span>{station.language}</span>}
      </div>

      <div className="card__foot">
        {station.has_stream ? (
          isPlaying ? (
            <button className="btn btn--active" onClick={() => onStop()}>
              <Square size={13} /> Stop
            </button>
          ) : (
            <button className="btn" onClick={() => onPlay(station)} disabled={online === false}>
              <Play size={14} /> Play
            </button>
          )
        ) : (
          <span className="card__na">No stream</span>
        )}

        <span className={`dot ${online === false ? 'dot--off' : online ? 'dot--on' : ''}`} title={online ? 'Online' : online === false ? 'Offline' : 'Unknown'} />

        <button className="btn btn--ghost" onClick={copy} title="Copy share link">
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    </article>
  )
}

export default function Channels({ catalog, status, loading, error, onReload, nowPlaying, onPlay, onStop }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const all = useAllChannels(catalog)

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return all.filter((s) => {
      const hay = [
        s.name_en,
        s.name_hi,
        s.city,
        s.frequency,
        s.language,
        s.category,
        s.cat_label,
        s.owner,
        s.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchQ = !query || hay.includes(query)

      let matchF = true
      if (filter === 'playable') matchF = !!s.has_stream
      else if (filter !== 'all') matchF = s.category === filter

      return matchQ && matchF
    })
  }, [all, q, filter])

  return (
    <section className="channels container" id="channels">
      <div className="channels__head">
        <h2>
          CHANNEL DIRECTORY <span className="hi">/ चैनल सूची</span>
        </h2>
        <div className="search">
          <Search size={15} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, city, frequency…"
            aria-label="Search channels"
          />
          {q && (
            <button className="search__clear" onClick={() => setQ('')} aria-label="Clear search">
              ×
            </button>
          )}
        </div>
      </div>

      <div className="filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`filter ${filter === f.id ? 'is-active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="card skeleton" key={i}>
              <div className="sk sk--title" />
              <div className="sk sk--line" />
              <div className="sk sk--line short" />
              <div className="sk sk--btn" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="empty">
          <p>Couldn’t load the catalog.</p>
          <button className="btn" onClick={onReload}>
            <RotateCw size={14} /> Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid">
            {filtered.map((s) => (
              <StationCard
                key={s.id}
                station={s}
                status={status}
                isPlaying={nowPlaying?.id === s.id}
                onPlay={onPlay}
                onStop={onStop}
              />
            ))}
          </div>
          {filtered.length === 0 && <p className="empty">No channels match “{q || filter}”.</p>}
        </>
      )}
    </section>
  )
}
