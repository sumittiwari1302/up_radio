import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Check, X, AlertTriangle } from 'lucide-react'

const FeedbackCtx = createContext(null)

export function useFeedback() {
  const ctx = useContext(FeedbackCtx)
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider')
  return ctx
}

let toastSeq = 0

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const dialogRef = useRef(null)
  const restoreFocus = useRef(null)

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message, opts = {}) => {
      const id = ++toastSeq
      const t = { id, message, type: opts.type || 'default' }
      setToasts((list) => [...list, t])
      setTimeout(() => dismiss(id), opts.duration ?? 3200)
      return id
    },
    [dismiss]
  )

  const confirm = useCallback((opts) => {
    restoreFocus.current = document.activeElement
    return new Promise((resolve) => {
      setDialog({
        title: opts.title || 'Are you sure?',
        message: opts.message || '',
        confirmLabel: opts.confirmLabel || 'Confirm',
        cancelLabel: opts.cancelLabel || 'Cancel',
        danger: !!opts.danger,
        resolve,
      })
    })
  }, [])

  const close = useCallback(
    (result) => {
      setDialog((d) => {
        d?.resolve(result)
        return null
      })
      if (restoreFocus.current?.focus) restoreFocus.current.focus()
    },
    []
  )

  useEffect(() => {
    if (!dialog) return
    const onKey = (e) => {
      if (e.key === 'Escape') close(false)
    }
    document.addEventListener('keydown', onKey)
    const btn = dialogRef.current?.querySelector('[data-autofocus]')
    btn?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [dialog, close])

  return (
    <FeedbackCtx.Provider value={{ toast, confirm }}>
      {children}

      <div className="toasts" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role="status">
            {t.type === 'success' && <Check size={15} />}
            {t.type === 'error' && <AlertTriangle size={15} />}
            <span>{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {dialog && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="modal__backdrop" onClick={() => close(false)} />
          <div className="modal__box" ref={dialogRef}>
            <h3 id="confirm-title" className="modal__title">{dialog.title}</h3>
            {dialog.message && <p className="modal__message">{dialog.message}</p>}
            <div className="modal__actions">
              <button className="btn" onClick={() => close(false)}>
                {dialog.cancelLabel}
              </button>
              <button
                data-autofocus
                className={`btn ${dialog.danger ? 'btn--danger' : 'btn--primary'}`}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackCtx.Provider>
  )
}
