import React, { useEffect, useRef } from 'react'

/**
 * Canvas oscilloscope / spectrum used as the "modulation monitor".
 * Reads real FFT data from the shared analyser when available and falls back
 * to a smooth synthetic waveform otherwise, so the monitor is never dead.
 */
export default function ModulationMonitor({ analyserRef, active, bars = 56, label }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const dataRef = useRef(null)
  const phaseRef = useRef(0)
  const colorsRef = useRef({ accent: '#f4a12a', dim: 'rgba(244,161,42,0.18)' })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const readColors = () => {
      const cs = getComputedStyle(document.documentElement)
      colorsRef.current = {
        accent: cs.getPropertyValue('--accent').trim() || '#f4a12a',
        dim: cs.getPropertyValue('--border-strong').trim() || 'rgba(244,161,42,0.18)',
      }
    }
    readColors()

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, canvas.clientWidth * dpr)
      canvas.height = Math.max(1, canvas.clientHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const mo = new MutationObserver(readColors)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      ctx.clearRect(0, 0, w, h)

      const { accent, dim } = colorsRef.current
      const analyser = analyserRef?.current
      const count = bars
      const gap = 2
      const bw = Math.max(2, (w - gap * (count - 1)) / count)

      // Baseline grid
      ctx.strokeStyle = dim
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, h / 2)
      ctx.lineTo(w, h / 2)
      ctx.stroke()

      phaseRef.current += 0.05
      const t = phaseRef.current

      let values
      if (active && analyser) {
        if (!dataRef.current || dataRef.current.length !== analyser.frequencyBinCount) {
          dataRef.current = new Uint8Array(analyser.frequencyBinCount)
        }
        analyser.getByteFrequencyData(dataRef.current)
        const d = dataRef.current
        const usable = Math.floor(d.length * 0.72)
        values = new Array(count)
        for (let i = 0; i < count; i++) {
          const idx = Math.floor((i / count) * usable)
          values[i] = d[idx] / 255
        }
      } else if (active) {
        values = new Array(count)
        for (let i = 0; i < count; i++) {
          const base = Math.sin(t + i * 0.35) * 0.5 + 0.5
          values[i] = base * (0.35 + 0.65 * Math.abs(Math.sin(t * 0.6 + i * 0.12)))
        }
      } else {
        values = new Array(count).fill(0.03)
      }

      const gradient = ctx.createLinearGradient(0, h, 0, 0)
      gradient.addColorStop(0, accent)
      gradient.addColorStop(1, dim)

      for (let i = 0; i < count; i++) {
        const v = Math.min(1, Math.max(0.02, values[i] || 0))
        const bh = v * (h - 6)
        const x = i * (bw + gap)
        const y = (h - bh) / 2
        ctx.fillStyle = gradient
        ctx.globalAlpha = active ? 0.95 : 0.35
        const r = Math.min(bw / 2, 3)
        ctx.beginPath()
        ctx.moveTo(x, y + r)
        ctx.arcTo(x, y, x + bw, y, r)
        ctx.arcTo(x + bw, y, x + bw, y + bh, r)
        ctx.arcTo(x + bw, y + bh, x, y + bh, r)
        ctx.arcTo(x, y + bh, x, y, r)
        ctx.closePath()
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      mo.disconnect()
    }
  }, [analyserRef, active, bars])

  return (
    <div className="monitor">
      <canvas ref={canvasRef} className="monitor__canvas" aria-hidden="true" />
      <div className="monitor__scan" aria-hidden="true" />
      <div className="monitor__caption">
        <span>MODULATION MONITOR</span>
        {label && <span className="monitor__status">{label}</span>}
      </div>
    </div>
  )
}
