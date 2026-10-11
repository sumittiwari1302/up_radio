import React from 'react'
import { MessageCircle } from 'lucide-react'

export default function FloatingContact({ onClick }) {
  return (
    <button className="fab" onClick={onClick} aria-label="Open contact form" title="Contact us">
      <MessageCircle size={22} />
      <span className="fab__label">Contact</span>
    </button>
  )
}
