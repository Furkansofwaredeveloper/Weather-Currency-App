import { useState } from 'react'
import './App.scss'
import CurrencyPanel from './components/CurrencyPanel'
import EarthquakePanel from './components/EarthquakePanel'
import WeatherPanel from './components/WeatherPanel'

function App() {
  const [activeTab, setActiveTab] = useState('weather')

  return (
    <main className="app">
      <header className="hero float-in">
        <div className="hero__text">
          <p className="hero__eyebrow">Gunun verileri</p>
          <h1 className="hero__title">Hava Durumu & Doviz Merkezi</h1>
          <p className="hero__subtitle">
            Anlik tahminler, sicaklik trendleri ve doviz karsilastirmalari tek
            ekranda.
          </p>
        </div>
        <div className="hero__badge">
          <div className="hero__badge-dot" />
          <span>Canli guncelleme</span>
        </div>
      </header>

      <section className="tabs">
        <div className="tabs__list" role="tablist" aria-label="Veri panelleri">
          <button
            type="button"
            role="tab"
            id="tab-weather"
            aria-controls="panel-weather"
            aria-selected={activeTab === 'weather'}
            className="tabs__button"
            onClick={() => setActiveTab('weather')}
          >
            Hava Durumu
          </button>
          <button
            type="button"
            role="tab"
            id="tab-currency"
            aria-controls="panel-currency"
            aria-selected={activeTab === 'currency'}
            className="tabs__button"
            onClick={() => setActiveTab('currency')}
          >
            Doviz
          </button>
          <button
            type="button"
            role="tab"
            id="tab-earthquake"
            aria-controls="panel-earthquake"
            aria-selected={activeTab === 'earthquake'}
            className="tabs__button"
            onClick={() => setActiveTab('earthquake')}
          >
            Deprem
          </button>
        </div>

        <div className="tabs__panels">
          <div
            role="tabpanel"
            id="panel-weather"
            aria-labelledby="tab-weather"
            hidden={activeTab !== 'weather'}
            className="tabs__panel"
          >
            <WeatherPanel />
          </div>
          <div
            role="tabpanel"
            id="panel-currency"
            aria-labelledby="tab-currency"
            hidden={activeTab !== 'currency'}
            className="tabs__panel"
          >
            <CurrencyPanel />
          </div>
          <div
            role="tabpanel"
            id="panel-earthquake"
            aria-labelledby="tab-earthquake"
            hidden={activeTab !== 'earthquake'}
            className="tabs__panel"
          >
            <EarthquakePanel />
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
