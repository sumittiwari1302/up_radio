import { useEffect } from 'react'

const KEY = 'up-radio:utm'
const PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid',
  'fbclid',
  'ref',
]

export function captureUTM() {
  if (typeof window === 'undefined') return {}
  const url = new URLSearchParams(window.location.search)
  const data = {}
  PARAMS.forEach((p) => {
    const v = url.get(p)
    if (v) data[p] = v
  })
  if (document.referrer) data.referrer = document.referrer
  if (Object.keys(data).length) {
    localStorage.setItem(KEY, JSON.stringify(data))
  }
  return data
}

export function getUTM() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export function withUTM(href) {
  const utm = getUTM()
  const keys = Object.keys(utm).filter((k) => k !== 'referrer')
  if (!keys.length) return href
  try {
    const url = new URL(href, window.location.origin)
    keys.forEach((k) => url.searchParams.set(k, utm[k]))
    return url.toString()
  } catch {
    return href
  }
}

export function useUTM() {
  useEffect(() => {
    const data = captureUTM()
    window.__UP_RADIO_UTM__ = Object.keys(data).length ? data : getUTM()
  }, [])
}
