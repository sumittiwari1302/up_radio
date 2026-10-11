import React, { useState, useEffect, useRef, useCallback } from 'react'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Channels from './components/Channels.jsx'
import Footer from './components/Footer.jsx'

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

export default function App() {
  const [catalog, setCatalog] = useState(null)
  const [status, setStatus] = useState({})
  const [presence, setPresence] = useState({ listeners: 0, nowPlaying: [] })
  const [connected, setConnected] = useState('connecting')
  const [nowPlaying, setNowPlaying] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const wsRef = useRef(null)
  const audioRef = useRef(null)

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
    return () => {
      audioRef.current?.pause()
    }
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

  return (
    <>
      <Header
        connected={connected}
        presence={presence}
        catalog={catalog}
        status={status}
      />
      <main>
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
      </main>
      <Footer catalog={catalog} />
    </>
  )
}
