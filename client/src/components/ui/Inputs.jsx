import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="field__error" role="alert">{error}</span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </div>
  )
}

export function TextInput({ id, error, ...props }) {
  return (
    <input
      id={id}
      className={`input ${error ? 'input--error' : ''}`}
      aria-invalid={!!error}
      {...props}
    />
  )
}

export function TextArea({ id, error, ...props }) {
  return (
    <textarea
      id={id}
      className={`input input--area ${error ? 'input--error' : ''}`}
      aria-invalid={!!error}
      {...props}
    />
  )
}

export function PasswordInput({ id, error, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className="input-wrap">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className={`input ${error ? 'input--error' : ''}`}
        aria-invalid={!!error}
        {...props}
      />
      <button
        type="button"
        className="input-eye"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}
