import './App.scss'
import CurrencyPanel from './components/CurrencyPanel'
import WeatherPanel from './components/WeatherPanel'

function App() {
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

      <section className="grid">
        <WeatherPanel />
        <CurrencyPanel />
      </section>
    </main>
  )
}

export default App
