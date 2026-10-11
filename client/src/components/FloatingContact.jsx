import React from 'react'
import { MessageSquare } from 'lucide-react'

export default function FloatingContact({ onClick }) {
  return (
    <button className="fab fab--right" onClick={onClick} aria-label="Open contact form" title="Contact us">
      <MessageSquare size={22} />
      <span className="fab__label">Contact</span>
    </button>
  )
}
