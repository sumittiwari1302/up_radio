import React, { useState } from 'react'
import { LogIn, Loader2, ShieldCheck } from 'lucide-react'
import Modal from './ui/Modal.jsx'
import { Field, TextInput, PasswordInput } from './ui/Inputs.jsx'
import { useFeedback } from './ui/Feedback.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function AuthModal({ open, onClose }) {
  const { toast } = useFeedback()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | success

  const set = (k) => (e) => {
    setValues((v) => ({ ...v, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const submit = async (ev) => {
    ev.preventDefault()
    const e = {}
    if (!EMAIL_RE.test(values.email.trim())) e.email = 'Please enter a valid email.'
    if (values.password.length < 6) e.password = 'Password must be at least 6 characters.'
    setErrors(e)
    if (Object.keys(e).length) {
      toast('Check the highlighted fields.', { type: 'error' })
      return
    }
    setStatus('sending')
    await new Promise((r) => setTimeout(r, 1200))
    setStatus('success')
    toast('Signed in (demo).', { type: 'success' })
  }

  const reset = () => {
    setValues({ email: '', password: '' })
    setErrors({})
    setStatus('idle')
  }

  return (
    <Modal open={open} onClose={onClose} title="Sign in" labelledBy="auth-title">
      {status === 'success' ? (
        <div className="form-success">
          <ShieldCheck size={40} className="form-success__icon" />
          <h4>You’re signed in</h4>
          <p>This is a demo account with no backend. Your password was never sent anywhere.</p>
          <button className="btn btn--primary" onClick={reset}>Sign in again</button>
        </div>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          <Field label="Email" htmlFor="a-email" error={errors.email}>
            <TextInput
              id="a-email"
              type="email"
              value={values.email}
              onChange={set('email')}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
              data-autofocus
            />
          </Field>

          <Field
            label="Password"
            htmlFor="a-password"
            error={errors.password}
            hint="Minimum 6 characters. Toggle the eye to reveal."
          >
            <PasswordInput
              id="a-password"
              value={values.password}
              onChange={set('password')}
              error={errors.password}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Field>

          <div className="form__actions">
            <button type="button" className="btn" onClick={onClose} disabled={status === 'sending'}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={status === 'sending'}>
              {status === 'sending' ? (
                <>
                  <Loader2 size={15} className="spin" /> Signing in…
                </>
              ) : (
                <>
                  <LogIn size={15} /> Sign in
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
