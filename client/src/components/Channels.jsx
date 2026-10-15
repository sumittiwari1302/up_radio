import React, { useMemo, useState } from 'react'
import { Play, Square, Search, Copy, Check, RotateCw } from 'lucide-react'
import { withUTM } from '../hooks/useUTM.js'
import { useFeedback } from './ui/Feedback.jsx'
import { useLanguage } from '../hooks/useLanguage.js'

const FILTERS = [
  { id: 'all', key: 'filters.all' },
  { id: 'playable', key: 'filters.playable' },
  { id: 'air', key: 'filters.air' },
  { id: 'community', key: 'filters.community' },
  { id: 'gyanvani', key: 'filters.gyanvani' },
  { id: 'online', key: 'filters.online' },
  { id: 'private', key: 'filters.private' },
]

function useAllChannels(catalog) {
  return useMemo(() => {
    const groups = catalog?.station_dashboard?.groups || []
    return groups.flatMap((g) =>
      (g.channels || []).map((c) => ({ ...c, group: g.group_name }))
    )
  }, [catalog])
}

function StationCard({ station, status, isPlaying, onPlay, onStop, t, lang }) {
  const { toast } = useFeedback()
  const [copied, setCopied] = useState(false)
  const st = status?.[station.id]
  const online = st?.online

  const getStationName = (station, lang) => {
    if (lang === 'hi' && station.name_hi) return station.name_hi
    if (lang === 'bho' && station.name_bho) return station.name_bho
    return station.name_en
  }

  const copy = async () => {
    const base = `${location.origin}/?stationId=${encodeURIComponent(station.id)}`
    const url = withUTM(base)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast(`${t('toast.linkCopied')} — ${getStationName(station, lang)}`, { type: 'success' })
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast(t('toast.copyFailed'), { type: 'error' })
    }
  }

  const stationName = getStationName(station, lang)
  const stationNameHi = lang === 'hi' ? station.name_hi : (lang === 'bho' ? station.name_bho : station.name_en)

  return (
    <article className="card" data-playing={isPlaying}>
      <div className="card__head">
        <div className="card__titles">
          <span className="card__name">{stationName}</span>
          {stationNameHi && stationNameHi !== stationName && <span className="card__hi">{stationNameHi}</span>}
        </div>
        <span className={`card__badge card__badge--${station.category}`}>
            {station.cat_label?.split(' / ')[0] || station.category}
          </span>
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
              <Square size={13} /> {t('player.stop')}
            </button>
          ) : (
            <button className="btn" onClick={() => onPlay(station)} disabled={online === false}>
              <Play size={14} /> {t('player.play')}
            </button>
          )
        ) : (
          <span className="card__na">{t('card.noStream')}</span>
        )}

        <span className={`dot ${online === false ? 'dot--off' : online ? 'dot--on' : ''}`} title={online ? t('status.online') : online === false ? t('status.offline') : t('status.unknown')} />

        <button className="btn btn--ghost" onClick={copy} title={t('toast.copyLink')}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    </article>
  )
}

export default function Channels({ catalog, status, loading, error, onReload, nowPlaying, onPlay, onStop }) {
  const { t, lang } = useLanguage()
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
          {t('channels.title')} <span className="hi">/ {t('channels.titleHi')}</span>
        </h2>
        <div className="search">
          <Search size={15} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('channels.search')}
            aria-label={t('channels.searchAria')}
          />
          {q && (
            <button className="search__clear" onClick={() => setQ('')} aria-label={t('search.clear')}>
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
            {t(f.key)}
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
          <p>{t('error.loadFailed')}</p>
          <button className="btn" onClick={onReload}>
            <RotateCw size={14} /> {t('button.retry')}
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
                t={t}
                lang={lang}
              />
            ))}
          </div>
          {filtered.length === 0 && <p className="empty">{t('channels.noResults')}</p>}
        </>
      )}
    </section>
  )
}