import React, { useState, useEffect, useRef, useCallback } from 'react'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Channels from './components/Channels.jsx'
import FAQ from './components/FAQ.jsx'
import Footer from './components/Footer.jsx'
import ScrollProgress from './components/ScrollProgress.jsx'
import BackToTop from './components/BackToTop.jsx'
import SkipToContent from './components/SkipToContent.jsx'
import CookieBanner from './components/CookieBanner.jsx'
import FloatingContact from './components/FloatingContact.jsx'
import ContactModal from './components/ContactModal.jsx'
import AuthModal from './components/AuthModal.jsx'
import MobileMenu from './components/MobileMenu.jsx'
import { FeedbackProvider } from './components/ui/Feedback.jsx'
import { useTheme } from './hooks/useTheme.js'
import { useUTM } from './hooks/useUTM.js'

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

export default function App() {
  const { theme, toggle } = useTheme()
  useUTM()

  const [catalog, setCatalog] = useState(null)
  const [status, setStatus] = useState({})
  const [presence, setPresence] = useState({ listeners: 0, nowPlaying: [] })
  const [connected, setConnected] = useState('connecting')
  const [nowPlaying, setNowPlaying] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const wsRef = useRef(null)
  const audioRef = useRef(null)
  const pendingStation = useRef(new URLSearchParams(location.search).get('stationId'))

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/channels', { headers: { accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setCatalog(await res.json())
    } catch (err) {
      setError(err.message || 'Failed to load catalog')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  useEffect(() => {
    let ws
    let retry

    const connect = () => {
      setConnected('connecting')
      ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => setConnected('live')
      ws.onclose = () => {
        setConnected('offline')
        retry = setTimeout(connect, 3000)
      }
      ws.onerror = () => setConnected('offline')
      ws.onmessage = (event) => {
        let msg
        try {
          msg = JSON.parse(event.data)
        } catch {
          return
        }
        if (msg.type === 'welcome' || msg.type === 'presence') {
          setPresence({ listeners: msg.listeners ?? 0, nowPlaying: msg.nowPlaying ?? [] })
          if (msg.statuses) setStatus(msg.statuses)
        } else if (msg.type === 'status') {
          setStatus(msg.statuses || {})
        }
      }
    }

    connect()
    return () => {
      clearTimeout(retry)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.preload = 'none'
    return () => audioRef.current?.pause()
  }, [])

  const play = useCallback((station) => {
    if (!station?.stream_url || !audioRef.current) return
    setNowPlaying(station)
    audioRef.current.src = station.stream_url
    audioRef.current.play().catch(() => setNowPlaying(null))
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'now-playing', stationId: station.id }))
    }
  }, [])

  const stop = useCallback(() => {
    audioRef.current?.pause()
    setNowPlaying(null)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stopped' }))
    }
  }, [])

  // Deep link: ?stationId=... auto-tunes once the catalog is ready.
  useEffect(() => {
    if (!catalog || !pendingStation.current) return
    const id = pendingStation.current
    const groups = catalog.station_dashboard?.groups || []
    const found = groups.flatMap((g) => g.channels || []).find((c) => c.id === id)
    if (found?.has_stream) {
      play(found)
      document.getElementById('channels')?.scrollIntoView({ behavior: 'smooth' })
    }
    pendingStation.current = null
  }, [catalog, play])

  return (
    <FeedbackProvider>
      <SkipToContent />
      <ScrollProgress />

      <Header
        connected={connected}
        presence={presence}
        catalog={catalog}
        theme={theme}
        onToggleTheme={toggle}
        onOpenMenu={() => setMenuOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
      />

      <main id="main">
        <Hero nowPlaying={nowPlaying} onStop={stop} />
        <Channels
          catalog={catalog}
          status={status}
          loading={loading}
          error={error}
          onReload={loadCatalog}
          nowPlaying={nowPlaying}
          onPlay={play}
          onStop={stop}
        />
        <FAQ />
      </main>

      <Footer catalog={catalog} />

      <FloatingContact onClick={() => setContactOpen(true)} />
      <BackToTop />
      <CookieBanner />

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} theme={theme} onToggleTheme={toggle} />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </FeedbackProvider>
  )
}
