import React, { useState } from 'react'
import { Plus } from 'lucide-react'

const FAQS = [
  {
    q: 'Where do the radio streams come from?',
    a: 'Every stream points to the broadcaster’s own public web player — Akashvani, community/campus stations and commercial FM. Audio is never hosted or re-encoded here.',
  },
  {
    q: 'Why do some stations show “No stream”?',
    a: 'Frequencies listed from reference sources do not always have a public online stream. Those stations appear in the directory for completeness but cannot be played.',
  },
  {
    q: 'A stream is not playing — what can I do?',
    a: 'Upstream servers occasionally go offline or block cross-origin requests. Try another station, reload, or click play again. The online/offline dot reflects the latest reachability check.',
  },
  {
    q: 'Do you store any personal data?',
    a: 'No accounts and no third-party trackers. Only local browser storage is used for your theme, consent choice and campaign (UTM) parameters.',
  },
  {
    q: 'Can I share a single station?',
    a: 'Yes. Use the copy button on any card — it copies a direct link with the station id (and your UTM tags) straight to your clipboard.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState(0)

  return (
    <section className="faq container" id="faq">
      <h2 className="section-title">
        Frequently Asked Questions <span className="hi">/ अक्सर पूछे जाने वाले प्रश्न</span>
      </h2>

      <div className="faq__list">
        {FAQS.map((item, i) => {
          const isOpen = open === i
          return (
            <div className={`faq-item ${isOpen ? 'is-open' : ''}`} key={item.q}>
              <button
                className="faq-item__q"
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                id={`faq-btn-${i}`}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                <span>{item.q}</span>
                <Plus size={18} className="faq-item__icon" />
              </button>
              <div
                className="faq-item__panel"
                id={`faq-panel-${i}`}
                role="region"
                aria-labelledby={`faq-btn-${i}`}
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="faq-item__inner">
                  <p>{item.a}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
