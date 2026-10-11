import React from 'react'

export default function SkipToContent({ targetId = 'channels' }) {
  return (
    <a className="skip-link" href={`#${targetId}`}>
      Skip to content
    </a>
  )
}
