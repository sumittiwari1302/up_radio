import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, labelledBy }) {
  const boxRef = useRef(null)
  const restore = useRef(null)

  useEffect(() => {
    if (!open) return
    restore.current = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && boxRef.current) {
        const nodes = boxRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
        )
        if (!nodes.length) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => {
      boxRef.current?.querySelector('[data-autofocus]')?.focus()
    }, 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      clearTimeout(t)
      restore.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__box" ref={boxRef}>
        <div className="modal__head">
          <h3 id={labelledBy} className="modal__title">{title}</h3>
          <button className="btn btn--ghost" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
