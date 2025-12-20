import { useEffect, useState } from 'react'
import { sortedLocations as fallbackLocations } from '../data/turkeyLocations'
import './WeatherPanel.scss'

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY
const OPENWEATHER_BASE_URL =
  import.meta.env.VITE_OPENWEATHER_BASE_URL || 'https://api.openweathermap.org'
const OPENWEATHER_FORECAST_PATH =
  import.meta.env.VITE_OPENWEATHER_FORECAST_PATH || '/data/2.5/forecast'
const OPENWEATHER_GEO_PATH =
  import.meta.env.VITE_OPENWEATHER_GEO_PATH || '/geo/1.0/direct'

const WEATHER_API = `${OPENWEATHER_BASE_URL}${OPENWEATHER_FORECAST_PATH}?appid=${OPENWEATHER_API_KEY}&units=metric&lang=tr`
const GEO_API = `${OPENWEATHER_BASE_URL}${OPENWEATHER_GEO_PATH}?appid=${OPENWEATHER_API_KEY}&limit=1`
const LOCATIONS_API =
  import.meta.env.VITE_TURKEY_LOCATIONS_API ||
  'https://turkiyeapi.dev/api/v1/provinces'

const formatTemp = (value) => `${Math.round(value)}°C`
const formatWind = (value) => `${Math.round(value)} m/s`
const getTempTone = (value) => {
  if (value === undefined || value === null) return ''
  if (value < 8) return 'is-cold'
  if (value < 20) return 'is-mild'
  return 'is-hot'
}

const formatDay = (value) =>
  new Date(value).toLocaleDateString('tr-TR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

function WeatherPanel() {
  const [locations, setLocations] = useState(fallbackLocations)
  const [locationsState, setLocationsState] = useState({
    status: 'loading',
    error: null,
  })
  const [selectedCity, setSelectedCity] = useState(fallbackLocations[0].city)
  const [selectedDistrict, setSelectedDistrict] = useState(
    fallbackLocations[0].districts[0]
  )
  const [weatherState, setWeatherState] = useState({
    status: 'loading',
    data: null,
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()
    const loadLocations = async () => {
      try {
        setLocationsState({ status: 'loading', error: null })
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
        setLocations(normalized)
        setLocationsState({ status: 'success', error: null })
      } catch (error) {
        if (error.name === 'AbortError') return
        setLocationsState({ status: 'error', error: error.message })
      }
    }

    loadLocations()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!locations.length) return
    const cityExists = locations.find((item) => item.city === selectedCity)
    const nextCity = cityExists ? selectedCity : locations[0].city
    const nextDistricts =
      locations.find((item) => item.city === nextCity)?.districts || []
    const nextDistrict = nextDistricts.includes(selectedDistrict)
      ? selectedDistrict
      : nextDistricts[0] || 'Merkez'
    if (nextCity !== selectedCity) setSelectedCity(nextCity)
    if (nextDistrict !== selectedDistrict) setSelectedDistrict(nextDistrict)
  }, [locations, selectedCity, selectedDistrict])

  useEffect(() => {
    const controller = new AbortController()
    const loadWeather = async () => {
      try {
        setWeatherState({ status: 'loading', data: null, error: null })
        const locationQuery = `${selectedDistrict}, ${selectedCity}, TR`
        const geoResponse = await fetch(
          `${GEO_API}&q=${encodeURIComponent(locationQuery)}`,
          { signal: controller.signal }
        )
        if (!geoResponse.ok) {
          throw new Error('Konum bilgisi alinamadi.')
        }
        const geoPayload = await geoResponse.json()
        const target = geoPayload[0]
        if (!target) {
          throw new Error('Konum bulunamadi.')
        }
        const weatherResponse = await fetch(
          `${WEATHER_API}&lat=${target.lat}&lon=${target.lon}`,
          { signal: controller.signal }
        )
        if (!weatherResponse.ok) {
          throw new Error('Hava durumu verisi alinamadi.')
        }
        const payload = await weatherResponse.json()
        setWeatherState({ status: 'success', data: payload, error: null })
      } catch (error) {
        if (error.name === 'AbortError') return
        setWeatherState({
          status: 'error',
          data: null,
          error: error.message,
        })
      }
    }

    loadWeather()

    return () => controller.abort()
  }, [selectedCity, selectedDistrict])

  const weather = weatherState.data
  const current = weather?.list?.[0]
  const location = weather?.city?.name
  const dailyForecast = []
  const dailyMap = new Map()

  ;(weather?.list || []).forEach((item) => {
    const [dayKey, timeKey] = item.dt_txt.split(' ')
    const hour = Number(timeKey.split(':')[0])
    const existing = dailyMap.get(dayKey) || {
      ...item,
      dayItem: null,
      nightItem: null,
    }
    const isDayCandidate = hour === 12 || hour === 15 || hour === 9
    const isNightCandidate = hour === 0 || hour === 3 || hour === 21

    if (isDayCandidate && !existing.dayItem) {
      existing.dayItem = item
    }
    if (isNightCandidate && !existing.nightItem) {
      existing.nightItem = item
    }

    dailyMap.set(dayKey, existing)
  })

  Array.from(dailyMap.values())
    .slice(0, 5)
    .forEach((item) => dailyForecast.push(item))

  const cityLabel = weather?.city?.name || selectedCity
  const selectedCityData =
    locations.find((item) => item.city === selectedCity) || locations[0]

  return (
    <article className="panel panel--weather float-in delay-1">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Hava Durumu</p>
          <h2 className="panel__title">{location || cityLabel}</h2>
        </div>
        <div className="panel__meta">
          <span className="status-pill">5 gunluk tahmin</span>
        </div>
      </div>

      <div className="panel__controls">
        <label className="field">
          <span>Şehir seç</span>
          <select
            value={selectedCity}
            onChange={(event) => {
              const nextCity = event.target.value
              setSelectedCity(nextCity)
              const nextDistricts =
                locations.find((item) => item.city === nextCity)?.districts || []
              setSelectedDistrict(nextDistricts[0] || 'Merkez')
            }}
          >
            {locations.map((city) => (
              <option key={city.city} value={city.city}>
                {city.city}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>İlçe seç</span>
          <select
            value={selectedDistrict}
            onChange={(event) => setSelectedDistrict(event.target.value)}
          >
            {selectedCityData?.districts?.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </label>
      </div>
      {locationsState.status === 'loading' && (
        <div className="panel__state">İl ve ilçe listesi yukleniyor...</div>
      )}
      {locationsState.status === 'error' && (
        <div className="panel__state panel__state--error">
          {locationsState.error}
        </div>
      )}

      {weatherState.status === 'loading' && (
        <div className="panel__state">Veriler aliniyor...</div>
      )}
      {weatherState.status === 'error' && (
        <div className="panel__state panel__state--error">
          {weatherState.error}
        </div>
      )}
      {weatherState.status === 'success' && current && (
        <div className="weather">
          <div className="weather__now">
            <div>
              <p className="weather__label">Simdi</p>
              <div className="weather__temp">{formatTemp(current.main.temp)}</div>
              <p className="weather__desc">{current.weather[0].description}</p>
              <div className="weather__stats">
                <span>Nem: %{current.main.humidity}</span>
                <span>Ruzgar: {formatWind(current.wind.speed)}</span>
              </div>
            </div>
            <img
              className="weather__icon"
              src={`https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`}
              alt={current.weather[0].description}
            />
          </div>

          <div className="forecast">
            {dailyForecast.map((item, index) => (
              <div
                key={item.dt}
                className="forecast__card"
                style={{ animationDelay: `${0.15 * index}s` }}
              >
                <div className="forecast__time">{formatDay(item.dt_txt)}</div>
                <img
                  src={`https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`}
                  alt={item.weather[0].description}
                />
                <div className="forecast__temp">
                  {formatTemp(item.main.temp)}
                </div>
                <div className="forecast__range">
                  <span
                    className={`forecast__range-item ${getTempTone(
                      item.dayItem?.main?.temp
                    )}`}
                  >
                    <span className="forecast__icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" role="presentation">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1l2.1-2.1M17 7l2.1-2.1" />
                      </svg>
                    </span>
                    Gündüz{' '}
                    {item.dayItem ? formatTemp(item.dayItem.main.temp) : '—'}
                  </span>
                  <span
                    className={`forecast__range-item ${getTempTone(
                      item.nightItem?.main?.temp
                    )}`}
                  >
                    <span className="forecast__icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" role="presentation">
                        <path d="M14.5 2.2a9 9 0 1 0 7.3 12.6A7 7 0 1 1 14.5 2.2z" />
                      </svg>
                    </span>
                    Gece{' '}
                    {item.nightItem ? formatTemp(item.nightItem.main.temp) : '—'}
                  </span>
                </div>
                <div className="forecast__desc">{item.weather[0].description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

export default WeatherPanel
