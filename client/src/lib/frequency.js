export function splitFrequency(station) {
  if (!station) return { value: '—', unit: '' }
  const { band, freq } = station
  if (band === 'FM' && Number.isFinite(freq)) {
    return { value: (freq / 10).toFixed(1), unit: 'MHz' }
  }
  if (band === 'MW' && Number.isFinite(freq)) {
    return { value: String(freq), unit: 'kHz' }
  }
  return { value: station.frequency || '—', unit: '' }
}

export function dialKey(station) {
  const bandRank = station.band === 'MW' ? 0 : 1
  return bandRank * 100000 + (Number.isFinite(station.freq) ? station.freq : 0)
}

export function sortForDial(stations) {
  return [...stations].sort((a, b) => dialKey(a) - dialKey(b))
}
