import React, { useState, useRef } from 'react'
import { Send, Loader2, CheckCircle2 } from 'lucide-react'
import Modal from './ui/Modal.jsx'
import { Field, TextInput, TextArea } from './ui/Inputs.jsx'
import { useFeedback } from './ui/Feedback.jsx'
import { getUTM } from '../hooks/useUTM.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const API_BASE = import.meta.env.PROD
  ? 'https://up-radio-api.YOUR_SUBDOMAIN.workers.dev'
  : '';

export default function ContactModal({ open, onClose }) {
  const { toast } = useFeedback()
  const [values, setValues] = useState({ name: '', email: '', message: '', website: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | success
  const openedAt = useRef(Date.now())

  const set = (k) => (e) => {
    setValues((v) => ({ ...v, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!values.name.trim()) e.name = 'Please enter your name.'
    if (!EMAIL_RE.test(values.email.trim())) e.email = 'Please enter a valid email.'
    if (values.message.trim().length < 10) e.message = 'Message must be at least 10 characters.'
    return e
  }

  const submit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      toast('Please fix the highlighted fields.', { type: 'error' })
      return
    }
    setStatus('sending')
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...values, formOpenedAt: openedAt.current }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.errors) setErrors(data.errors)
        toast(data.error === 'rate_limited' ? 'Too many messages — please try later.' : 'Message could not be sent.', {
          type: 'error',
        })
        setStatus('idle')
        return
      }
      setStatus('success')
      toast('Message sent successfully.', { type: 'success' })
      setValues({ name: '', email: '', message: '', website: '' })
      openedAt.current = Date.now()
    } catch {
      toast('Network error — please try again.', { type: 'error' })
      setStatus('idle')
    }
  }

  const utm = getUTM()
  const hasUTM = Object.keys(utm).filter((k) => k !== 'referrer').length > 0

  const reset = () => {
    setValues({ name: '', email: '', message: '', website: '' })
    setErrors({})
    setStatus('idle')
    openedAt.current = Date.now()
  }

  return (
    <Modal open={open} onClose={onClose} title="Contact us" labelledBy="contact-title">
      {status === 'success' ? (
        <div className="form-success">
          <CheckCircle2 size={40} className="form-success__icon" />
          <h4>Thanks!</h4>
          <p>Your message has been sent. We’ll get back to you shortly.</p>
          <button className="btn btn--primary" onClick={reset}>Send another</button>
        </div>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          <Field label="Name" htmlFor="c-name" error={errors.name}>
            <TextInput
              id="c-name"
              name="name"
              value={values.name}
              onChange={set('name')}
              error={errors.name}
              placeholder="Your name"
              autoComplete="name"
              data-autofocus
            />
          </Field>

          <Field label="Email" htmlFor="c-email" error={errors.email}>
            <TextInput
              id="c-email"
              name="email"
              type="email"
              value={values.email}
              onChange={set('email')}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>

          <Field
            label="Message"
            htmlFor="c-message"
            error={errors.message}
            hint="Tell us about a missing station, a broken stream or feedback."
          >
            <TextArea
              id="c-message"
              name="message"
              rows={4}
              value={values.message}
              onChange={set('message')}
              error={errors.message}
              placeholder="Type your message…"
            />
          </Field>

          {/* Honeypot — hidden from humans, bots fill it in. */}
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="c-website">Website</label>
            <input
              id="c-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={values.website}
              onChange={set('website')}
            />
          </div>

          {hasUTM && (
            <p className="form-note">
              Campaign tag detected — will be attached automatically.
            </p>
          )}

          <div className="form__actions">
            <button type="button" className="btn" onClick={onClose} disabled={status === 'sending'}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={status === 'sending'}>
              {status === 'sending' ? (
                <>
                  <Loader2 size={15} className="spin" /> Sending…
                </>
              ) : (
                <>
                  <Send size={15} /> Send message
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
