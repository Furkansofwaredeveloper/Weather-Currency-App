import { useEffect, useMemo, useRef, useState } from 'react'
import { sortedLocations as fallbackLocations } from '../data/turkeyLocations'
import './EarthquakePanel.scss'

const EARTHQUAKE_API_URL =
  import.meta.env.VITE_EARTHQUAKE_API_URL ||
  'https://api.orhanaydogdu.com.tr/deprem/kandilli/live'
const LOCATIONS_API =
  import.meta.env.VITE_TURKEY_LOCATIONS_API ||
  'https://turkiyeapi.dev/api/v1/provinces'
const POLL_INTERVAL = 10000
const DEFAULT_LIMIT = 10
const NOTIFICATION_STORAGE_KEY = 'earthquakeNotificationsEnabled'

const formatMagnitude = (value) =>
  Number.isFinite(value) ? value.toFixed(1) : '—'

const parseDate = (value) => {
  if (!value) return null
  if (value instanceof Date) return value
  const normalized = String(value)
    .trim()
    .replace(/\./g, '-')
    .replace(' ', 'T')
  const parsed = new Date(normalized)
  if (!Number.isNaN(parsed.getTime())) return parsed
  const fallback = new Date(value)
  if (!Number.isNaN(fallback.getTime())) return fallback
  return null
}

const formatDateTime = (value) => {
  const parsed = parseDate(value)
  if (!parsed) return '—'
  return parsed.toLocaleString('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const getQuakeId = (item) =>
  item?.earthquake_id ||
  item?._id ||
  item?.id ||
  `${item?.date || item?.date_time || item?.datetime || ''}-${item?.title || ''}`

const getCoordinates = (item) => {
  const coords =
    item?.geojson?.coordinates ||
    item?.coordinates ||
    item?.location?.coordinates
  if (Array.isArray(coords) && coords.length >= 2) {
    return { lon: coords[0], lat: coords[1] }
  }
  return null
}

const getMagnitudeTone = (value) => {
  if (!Number.isFinite(value)) return ''
  if (value < 3.5) return 'is-low'
  if (value < 5) return 'is-mid'
  return 'is-high'
}

function EarthquakePanel() {
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const searchRef = useRef(null)
  const [locationState, setLocationState] = useState({
    status: 'loading',
    data: fallbackLocations,
    error: null,
  })
  const [quakesState, setQuakesState] = useState({
    status: 'loading',
    data: [],
    error: null,
    updatedAt: null,
  })
  const [notificationStatus, setNotificationStatus] = useState(() => {
    if (typeof window === 'undefined') return 'unsupported'
    if (!('Notification' in window)) return 'unsupported'
    return Notification.permission
  })
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      const stored = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY)
      if (stored === 'false') return false
    } catch (error) {
      // Ignore storage errors.
    }
    return true
  })
  const [alert, setAlert] = useState(null)
  const notifiedIdsRef = useRef(new Set())
  const initialLoadRef = useRef(true)

  useEffect(() => {
    const controller = new AbortController()
    const loadLocations = async () => {
      try {
        setLocationState((current) => ({
          ...current,
          status: 'loading',
          error: null,
        }))
        const response = await fetch(LOCATIONS_API, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Konum listesi alinamadi.')
        }
        const payload = await response.json()
        const source = Array.isArray(payload?.data) ? payload.data : payload
        if (!Array.isArray(source)) {
          throw new Error('Konum verisi beklenmeyen formatta.')
        }
        const normalized = source
          .map((item) => ({
            city: item?.name,
            districts: (item?.districts || [])
              .map((district) => district?.name || district)
              .filter(Boolean),
          }))
          .filter((item) => item.city && item.districts.length > 0)
          .sort((a, b) => a.city.localeCompare(b.city, 'tr'))
        if (normalized.length === 0) {
          throw new Error('Konum listesi bos geldi.')
        }
        setLocationState({ status: 'success', data: normalized, error: null })
      } catch (error) {
        if (error.name === 'AbortError') return
        setLocationState((current) => ({
          ...current,
          status: 'error',
          error: error.message,
        }))
      }
    }

    loadLocations()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!searchRef.current) return
      if (!searchRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    let isMounted = true
    let controller = null

    const loadQuakes = async () => {
      if (!isMounted) return
      if (controller) controller.abort()
      controller = new AbortController()
      try {
        setQuakesState((current) => ({
          ...current,
          status: current.data.length ? 'success' : 'loading',
          error: null,
        }))
        const response = await fetch(`${EARTHQUAKE_API_URL}?limit=${limit}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Deprem verisi alinamadi.')
        }
        const payload = await response.json()
        const source = Array.isArray(payload?.result)
          ? payload.result
          : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
          ? payload
          : []
        if (!Array.isArray(source)) {
          throw new Error('Deprem verisi beklenmeyen formatta.')
        }
        const updatedAt =
          payload?.metadata?.date ||
          payload?.lastupdate ||
          payload?.last_update ||
          new Date().toISOString()
        setQuakesState({
          status: 'success',
          data: source,
          error: null,
          updatedAt,
        })

        if (!initialLoadRef.current) {
          const fresh = source.filter((item) => {
            const id = getQuakeId(item)
            return id && !notifiedIdsRef.current.has(id)
          })
          if (fresh.length > 0) {
            setAlert({
              count: fresh.length,
              latest: fresh[0],
            })
            if (notificationStatus === 'granted' && notificationsEnabled) {
              fresh.forEach((item) => {
                const title = item?.title || item?.location || 'Deprem'
                const body = `${formatMagnitude(
                  Number(item?.mag)
                )} · ${formatDateTime(item?.date || item?.date_time)}`
                try {
                  new Notification(`Deprem Uyarisi: ${title}`, { body })
                } catch (error) {
                  // Ignore notification errors.
                }
              })
            }
          } else {
            setAlert(null)
          }
        }

        source.forEach((item) => {
          const id = getQuakeId(item)
          if (id) notifiedIdsRef.current.add(id)
        })
        initialLoadRef.current = false
      } catch (error) {
        if (error.name === 'AbortError') return
        setQuakesState((current) => ({
          ...current,
          status: 'error',
          error: error.message,
        }))
      }
    }

    loadQuakes()
    const interval = setInterval(loadQuakes, POLL_INTERVAL)

    return () => {
      isMounted = false
      if (controller) controller.abort()
      clearInterval(interval)
    }
  }, [limit, notificationStatus, notificationsEnabled])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        NOTIFICATION_STORAGE_KEY,
        String(notificationsEnabled)
      )
    } catch (error) {
      // Ignore storage errors.
    }
  }, [notificationsEnabled])

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr-TR')
  const locationSuggestions = useMemo(() => {
    const unique = new Set()
    const source =
      locationState.status === 'success' ? locationState.data : fallbackLocations
    source.forEach((item) => {
      if (!item?.city) return
      unique.add(item.city)
      item.districts?.forEach((district) => {
        if (!district) return
        unique.add(`${district}, ${item.city}`)
      })
    })
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'tr'))
  }, [locationState.status, locationState.data])
  const suggestionMatches = useMemo(() => {
    if (!normalizedQuery) return []
    return locationSuggestions
      .filter((item) =>
        item.toLocaleLowerCase('tr-TR').startsWith(normalizedQuery)
      )
      .slice(0, 10)
  }, [locationSuggestions, normalizedQuery])
  const shouldShowSuggestions =
    showSuggestions && normalizedQuery && suggestionMatches.length > 0

  useEffect(() => {
    setActiveSuggestionIndex(-1)
  }, [normalizedQuery, suggestionMatches.length])

  const selectSuggestion = (value) => {
    if (!value) return
    setSearchQuery(value)
    setShowSuggestions(false)
  }
  const filteredQuakes = useMemo(
    () => {
      if (!normalizedQuery) return quakesState.data
      const terms = normalizedQuery
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      return quakesState.data.filter((item) => {
        const haystack = `${item?.title || ''} ${item?.location || ''}`.toLocaleLowerCase(
          'tr-TR'
        )
        return terms.some((term) => haystack.includes(term))
      })
    },
    [quakesState.data, normalizedQuery]
  )

  const updatedLabel = quakesState.updatedAt
    ? formatDateTime(quakesState.updatedAt)
    : '—'

  const enableNotifications = async () => {
    if (notificationStatus === 'unsupported') return
    if (notificationStatus === 'granted') {
      setNotificationsEnabled(true)
      return
    }
    try {
      const permission = await Notification.requestPermission()
      setNotificationStatus(permission)
      if (permission === 'granted') {
        setNotificationsEnabled(true)
      }
    } catch (error) {
      setNotificationStatus('denied')
    }
  }

  const disableNotifications = () => {
    setNotificationsEnabled(false)
  }

  return (
    <article className="panel panel--earthquake float-in delay-1">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Turkiye Deprem Takibi</p>
          <h2 className="panel__title">Son Depremler</h2>
        </div>
        <div className="panel__meta">
          <span className="status-pill status-pill--live">
            <span className="quake__live-dot" aria-hidden="true" />
            Anlik Veriler
          </span>
        </div>
      </div>

      <div className="quake__controls">
        <label className="field" ref={searchRef}>
          <span>Liste boyutu</span>
          <select
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            {[5, 10, 20, 30].map((value) => (
              <option key={value} value={value}>
                Son {value} deprem
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Konum ara</span>
          <input
            type="search"
            placeholder="Il, ilce veya bolge..."
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' && suggestionMatches.length > 0) {
                event.preventDefault()
                setShowSuggestions(true)
                setActiveSuggestionIndex((current) => {
                  const next = current + 1
                  return next >= suggestionMatches.length ? 0 : next
                })
              }
              if (event.key === 'ArrowUp' && suggestionMatches.length > 0) {
                event.preventDefault()
                setShowSuggestions(true)
                setActiveSuggestionIndex((current) => {
                  if (current <= 0) return suggestionMatches.length - 1
                  return current - 1
                })
              }
              if (event.key === 'Enter' && suggestionMatches.length > 0) {
                event.preventDefault()
                const target =
                  activeSuggestionIndex >= 0
                    ? suggestionMatches[activeSuggestionIndex]
                    : suggestionMatches[0]
                selectSuggestion(target)
              }
              if (event.key === 'Escape') {
                setShowSuggestions(false)
              }
            }}
          />
          {shouldShowSuggestions && (
            <div className="quake__suggestions" role="listbox">
              {suggestionMatches.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  className="quake__suggestion-item"
                  aria-selected={index === activeSuggestionIndex}
                  onMouseDown={(event) => {
                    event.preventDefault()
                  }}
                  onClick={() => selectSuggestion(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </label>
        <div className="quake__notification">
          <span>Bildirim</span>
          {notificationStatus === 'unsupported' && (
            <p>Tarayici bildirimleri desteklemiyor.</p>
          )}
          {notificationStatus === 'granted' && notificationsEnabled && (
            <p>Bildirimler acik.</p>
          )}
          {notificationStatus === 'granted' && !notificationsEnabled && (
            <p>Bildirimler kapali.</p>
          )}
          {notificationStatus === 'denied' && (
            <p>Bildirim izni reddedildi.</p>
          )}
          {(notificationStatus === 'default' ||
            (notificationStatus === 'granted' && !notificationsEnabled)) && (
            <button type="button" onClick={enableNotifications}>
              Bildirimleri ac
            </button>
          )}
          {notificationStatus === 'granted' && notificationsEnabled && (
            <button type="button" onClick={disableNotifications}>
              Bildirimleri kapat
            </button>
          )}
        </div>
      </div>

      <div className="quake__summary">
        <div>
          <p>Guncelleme: {updatedLabel}</p>
          <p>
            Gosterilen: {filteredQuakes.length} / {quakesState.data.length}
          </p>
        </div>
        {alert && (
          <div className="quake__alert">
            <strong>Yeni deprem</strong>
            <span>
              {alert.count} yeni kayit geldi. Son: {alert.latest?.title || '—'}
            </span>
          </div>
        )}
      </div>

      {quakesState.status === 'loading' && (
        <div className="panel__state">Deprem verileri aliniyor...</div>
      )}
      {quakesState.status === 'error' && (
        <div className="panel__state panel__state--error">
          {quakesState.error}
        </div>
      )}

      {quakesState.status === 'success' &&
        (filteredQuakes.length === 0 ? (
          <div className="panel__state">Deprem verisi bulunamadi.</div>
        ) : (
          <div className="quake__list">
            {filteredQuakes.map((item, index) => {
              const quakeId = getQuakeId(item) || `quake-${index}`
              const coords = getCoordinates(item)
              const mapUrl = coords
                ? `https://www.google.com/maps?q=${coords.lat},${coords.lon}`
                : null
              return (
                <article key={quakeId} className="quake__card">
                  <div className="quake__card-header">
                    <span
                      className={`quake__badge ${getMagnitudeTone(
                        Number(item?.mag)
                      )}`}
                    >
                      M {formatMagnitude(Number(item?.mag))}
                    </span>
                    <span className="quake__time">
                      {formatDateTime(item?.date || item?.date_time)}
                    </span>
                  </div>
                  <h3 className="quake__title">
                    {item?.title || item?.location || 'Konum bilgisi yok'}
                  </h3>
                  <div className="quake__meta">
                    <span>Derinlik: {item?.depth ?? '—'} km</span>
                    {coords && (
                      <span>
                        Koordinat: {coords.lat.toFixed(3)},{' '}
                        {coords.lon.toFixed(3)}
                      </span>
                    )}
                  </div>
                  {mapUrl && (
                    <a
                      className="quake__map-link"
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Haritada goster
                    </a>
                  )}
                </article>
              )
            })}
          </div>
        ))}
    </article>
  )
}

export default EarthquakePanel
