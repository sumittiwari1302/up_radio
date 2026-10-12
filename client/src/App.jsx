import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Channels from './components/Channels.jsx'
import FAQ from './components/FAQ.jsx'
import Sources from './pages/Sources.jsx'
import Footer from './components/Footer.jsx'
import BackToTop from './components/BackToTop.jsx'
import SkipToContent from './components/SkipToContent.jsx'
import CookieBanner from './components/CookieBanner.jsx'
import FloatingContact from './components/FloatingContact.jsx'
import ContactModal from './components/ContactModal.jsx'
import MobileMenu from './components/MobileMenu.jsx'
import StickyPlayer from './components/StickyPlayer.jsx'
import { FeedbackProvider } from './components/ui/Feedback.jsx'
import { useTheme } from './hooks/useTheme.js'
import { useUTM } from './hooks/useUTM.js'
import { useRadio } from './hooks/useRadio.js'
import { track } from './lib/analytics.js'
import { sortForDial } from './lib/frequency.js'

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const { theme, toggle } = useTheme()
  useUTM()

  const [catalog, setCatalog] = useState(null)
  const [status, setStatus] = useState({})
  const [presence, setPresence] = useState({ listeners: 0, nowPlaying: [] })
  const [connected, setConnected] = useState('connecting')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [playerHidden, setPlayerHidden] = useState(false)

  const wsRef = useRef(null)
  const pendingStation = useRef(new URLSearchParams(location.search).get('stationId'))

  const notify = useCallback((station) => {
    if (station) track('play', { stationId: station.id })
    else track('stop')
    const ws = wsRef.current
    if (ws?.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify(station ? { type: 'now-playing', stationId: station.id } : { type: 'stopped' }))
  }, [])

  const radio = useRadio({ onChange: notify })
  const { nowPlaying, play, stop, volume, setVolume, muted, toggleMute, analyserRef } = radio

  const changeVolume = useCallback(
    (v) => {
      setVolume(v)
      if (muted && v > 0) toggleMute()
    },
    [muted, setVolume, toggleMute]
  )

  const playableStations = useMemo(() => {
    const groups = catalog?.station_dashboard?.groups || []
    const all = groups.flatMap((g) => g.channels || []).filter((c) => c.has_stream)
    return sortForDial(all)
  }, [catalog])

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
    track('pageview', { path: location.pathname })
  }, [])

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

  const showPlayer = !!nowPlaying && !playerHidden
  useEffect(() => {
    document.body.classList.toggle('has-player', showPlayer)
    return () => document.body.classList.remove('has-player')
  }, [showPlayer])

  useEffect(() => {
    if (nowPlaying) setPlayerHidden(false)
  }, [nowPlaying])

  useEffect(() => {
    if (!catalog || !pendingStation.current) return
    const id = pendingStation.current
    const found = playableStations.find((c) => c.id === id)
    if (found) {
      play(found)
      document.getElementById('channels')?.scrollIntoView({ behavior: 'smooth' })
    }
    pendingStation.current = null
  }, [catalog, playableStations, play])

  const expandConsole = useCallback(() => {
    setPlayerHidden(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const navLinks = [
    { path: '/channels', label: 'Channels' },
    { path: '/faq', label: 'FAQ' },
    { path: '/sources', label: 'Sources' },
  ]

  return (
    <BrowserRouter>
      <FeedbackProvider>
        <SkipToContent />
        <ScrollToTop />

        <Header
          connected={connected}
          presence={presence}
          catalog={catalog}
          theme={theme}
          onToggleTheme={toggle}
          onOpenMenu={() => setMenuOpen(true)}
          navLinks={navLinks}
        />

        <main id="main">
          <Routes>
            <Route path="/" element={
              <>
                <Hero
                  stations={playableStations}
                  nowPlaying={nowPlaying}
                  onPlay={play}
                  onStop={stop}
                  analyserRef={analyserRef}
                  volume={volume}
                  onVolume={changeVolume}
                  muted={muted}
                  onToggleMute={toggleMute}
                />
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
              </>
            } />
            <Route path="/channels" element={
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
            } />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/sources" element={<Sources />} />
          </Routes>
        </main>

        <Footer catalog={catalog} onContact={() => setContactOpen(true)} />

        <FloatingContact onClick={() => setContactOpen(true)} />
        <BackToTop />
        <CookieBanner />

        <StickyPlayer
          nowPlaying={nowPlaying}
          onStop={stop}
          onExpand={expandConsole}
          analyserRef={analyserRef}
          volume={volume}
          onVolume={changeVolume}
          muted={muted}
          onToggleMute={toggleMute}
          onHide={() => setPlayerHidden(true)}
        />

        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} theme={theme} onToggleTheme={toggle} />
        <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
      </FeedbackProvider>
    </BrowserRouter>
  )
}
