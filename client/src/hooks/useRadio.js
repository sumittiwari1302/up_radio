import { useCallback, useEffect, useRef, useState } from 'react'

const HLS_RE = /\.m3u8(\?|$)/i
const VOLUME_KEY = 'up-radio:volume'

let hlsModule

async function getHls() {
  if (!hlsModule) {
    hlsModule = (await import('hls.js')).default
  }
  return hlsModule
}

function initialVolume() {
  if (typeof window === 'undefined') return 0.8
  const saved = parseFloat(localStorage.getItem(VOLUME_KEY))
  return Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 0.8
}

/**
 * Owns the single <audio> element, the Web Audio analyser used by the
 * modulation monitor, volume/mute state and (optionally) hls.js playback.
 */
export function useRadio({ onChange } = {}) {
  const audioRef = useRef(null)
  const ctxRef = useRef(null)
  const analyserRef = useRef(null)
  const hlsRef = useRef(null)
  const graphReadyRef = useRef(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [nowPlaying, setNowPlaying] = useState(null)
  const [volume, setVolume] = useState(initialVolume)
  const [muted, setMuted] = useState(false)

  const teardownHls = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy()
      } catch {
        /* noop */
      }
      hlsRef.current = null
    }
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audio.crossOrigin = 'anonymous'
    audio.volume = volume
    audioRef.current = audio
    return () => {
      try {
        audio.pause()
      } catch {
        /* noop */
      }
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy()
        } catch {
          /* noop */
        }
      }
      if (ctxRef.current) {
        try {
          ctxRef.current.close()
        } catch {
          /* noop */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume))
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume
  }, [volume, muted])

  // Route the element through an analyser so the modulation monitor can read
  // real signal. Falls back to direct playback if Web Audio is unavailable.
  const ensureGraph = useCallback(() => {
    if (graphReadyRef.current) return
    graphReadyRef.current = true
    const audio = audioRef.current
    if (!audio) return
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      const ctx = new AC()
      const source = ctx.createMediaElementSource(audio)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.82
      source.connect(analyser)
      analyser.connect(ctx.destination)
      ctxRef.current = ctx
      analyserRef.current = analyser
    } catch {
      graphReadyRef.current = false
      ctxRef.current = null
      analyserRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    teardownHls()
    const audio = audioRef.current
    if (audio) {
      try {
        audio.pause()
      } catch {
        /* noop */
      }
    }
    setNowPlaying(null)
    onChangeRef.current?.(null)
  }, [teardownHls])

  const play = useCallback(
    async (station) => {
      const audio = audioRef.current
      if (!audio || !station?.stream_url) return
      teardownHls()
      setNowPlaying(station)
      onChangeRef.current?.(station)

      ensureGraph()
      if (ctxRef.current?.state === 'suspended') {
        ctxRef.current.resume().catch(() => {})
      }

      const url = station.stream_url
      const type = station.audio_type || station.type
      const isHls = type === 'hls' || HLS_RE.test(url)
      const nativeHls = audio.canPlayType('application/vnd.apple.mpegurl')

      if (isHls && !nativeHls) {
        try {
          const Hls = await getHls()
          if (Hls.isSupported()) {
            const hls = new Hls({
              lowLatencyMode: true,
              backBufferLength: 30,
              enableWorker: true,
            })
            hlsRef.current = hls
            hls.loadSource(url)
            hls.attachMedia(audio)
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              audio.play().catch(() => {})
            })
            hls.on(Hls.Events.ERROR, (_evt, data) => {
              if (data?.fatal) {
                stop()
              }
            })
            return
          }
        } catch {
          /* fall through to native element playback */
        }
      }

      audio.src = url
      try {
        await audio.play()
      } catch {
        setNowPlaying(null)
        onChangeRef.current?.(null)
      }
    },
    [ensureGraph, stop, teardownHls]
  )

  const toggleMute = useCallback(() => setMuted((m) => !m), [])

  return {
    nowPlaying,
    play,
    stop,
    volume,
    setVolume,
    muted,
    toggleMute,
    analyserRef,
  }
}
