import { useEffect, useMemo, useState } from 'react'
import './CurrencyPanel.scss'

const RATES_URL = 'https://open.er-api.com/v6/latest'
const FALLBACK_CURRENCIES = [
  { code: 'TRY', description: 'Turkish Lira' },
  { code: 'USD', description: 'US Dollar' },
  { code: 'EUR', description: 'Euro' },
  { code: 'GBP', description: 'British Pound' },
  { code: 'JPY', description: 'Japanese Yen' },
  { code: 'CHF', description: 'Swiss Franc' },
  { code: 'CAD', description: 'Canadian Dollar' },
  { code: 'AUD', description: 'Australian Dollar' },
]

function CurrencyPanel() {
  const [amount, setAmount] = useState('100')
  const [fromCurrency, setFromCurrency] = useState('TRY')
  const [toCurrency, setToCurrency] = useState('USD')
  const [symbolsState, setSymbolsState] = useState({
    status: 'loading',
    symbols: [],
    error: null,
  })
  const [rateState, setRateState] = useState({
    status: 'loading',
    rate: null,
    date: null,
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()
    const loadSymbols = async () => {
      try {
        setSymbolsState({ status: 'loading', symbols: [], error: null })
        const response = await fetch(`${RATES_URL}/USD`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Para birimleri alinamadi.')
        }
        const payload = await response.json()
        if (payload.result === 'error' || !payload.rates) {
          throw new Error('Para birimleri alinamadi.')
        }
        const list = Object.keys(payload.rates || {})
          .concat(payload.base_code ? [payload.base_code] : [])
          .filter(Boolean)
          .filter((value, index, array) => array.indexOf(value) === index)
          .map((code) => ({ code, description: code }))
          .sort((a, b) => a.code.localeCompare(b.code))
        setSymbolsState({ status: 'success', symbols: list, error: null })
        if (list.length > 0) {
          const codes = new Set(list.map((item) => item.code))
          setFromCurrency((current) => (codes.has(current) ? current : list[0].code))
          setToCurrency((current) =>
            codes.has(current) ? current : list[1]?.code || list[0].code
          )
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        setSymbolsState({
          status: 'error',
          symbols: FALLBACK_CURRENCIES,
          error: error.message,
        })
      }
    }

    loadSymbols()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!fromCurrency || !toCurrency) return
    const controller = new AbortController()
    const loadRates = async () => {
      try {
        setRateState({ status: 'loading', rate: null, date: null, error: null })
        const response = await fetch(
          `${RATES_URL}/${fromCurrency}`,
          { signal: controller.signal }
        )
        if (!response.ok) {
          throw new Error('Kur bilgisi alinamadi.')
        }
        const payload = await response.json()
        if (payload.result === 'error') {
          throw new Error('Kur bilgisi alinamadi.')
        }
        const rateValue = payload.rates?.[toCurrency]
        if (!rateValue) {
          throw new Error('Secilen kur bulunamadi.')
        }
        setRateState({
          status: 'success',
          rate: rateValue,
          date: payload.time_last_update_utc
            ? new Date(payload.time_last_update_utc).toLocaleDateString('tr-TR')
            : payload.time_last_update_utc,
          error: null,
        })
      } catch (error) {
        if (error.name === 'AbortError') return
        setRateState({
          status: 'error',
          rate: null,
          date: null,
          error: error.message,
        })
      }
    }

    loadRates()

    return () => controller.abort()
  }, [fromCurrency, toCurrency])

  const converted = useMemo(() => {
    const numeric = parseFloat(amount)
    if (!rateState.rate || Number.isNaN(numeric)) return '—'
    return (numeric * rateState.rate).toFixed(2)
  }, [amount, rateState.rate])

  const swapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  return (
    <article className="panel panel--currency float-in delay-2">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Doviz Donusturucu</p>
          <h2 className="panel__title">Aninda Karsilastir</h2>
        </div>
        <div className="panel__meta">
          <span className="status-pill">Guncel kur</span>
        </div>
      </div>

      <div className="currency">
        <label className="field">
          <span>Tutar</span>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>

        <div className="currency__row">
          <label className="field">
            <span>Kaynak</span>
            <select
              value={fromCurrency}
              onChange={(event) => setFromCurrency(event.target.value)}
            >
              {symbolsState.symbols.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} — {currency.description}
                </option>
              ))}
            </select>
          </label>

          <button className="swap" type="button" onClick={swapCurrencies}>
            Degistir
          </button>

          <label className="field">
            <span>Hedef</span>
            <select
              value={toCurrency}
              onChange={(event) => setToCurrency(event.target.value)}
            >
              {symbolsState.symbols.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} — {currency.description}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="currency__result">
          <div>
            <p className="currency__label">Sonuc</p>
            <div className="currency__value">
              {converted} {toCurrency}
            </div>
          </div>
          <div className="currency__meta">
            {rateState.status === 'loading' && <span>Kur aliniyor...</span>}
            {rateState.status === 'error' && (
              <span className="error-text">{rateState.error}</span>
            )}
            {rateState.status === 'success' && rateState.rate && (
              <span>
                1 {fromCurrency} = {rateState.rate.toFixed(4)} {toCurrency} ·{' '}
                {rateState.date}
              </span>
            )}
          </div>
        </div>

        <div className="currency__hint">
          {symbolsState.status === 'loading' && 'Para birimleri yukleniyor...'}
          {symbolsState.status === 'error' && symbolsState.error}
          {symbolsState.status === 'success' &&
            'Kur verileri open.er-api.com servisinden gelir.'}
        </div>
      </div>
    </article>
  )
}

export default CurrencyPanel
