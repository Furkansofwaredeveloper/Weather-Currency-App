# Hava Durumu & Doviz Merkezi

Turkiye odakli hava durumu, doviz karsilastirma ve deprem takibini tek ekranda sunan React + Vite uygulamasi.

## Ozellikler
- Sehir/ilce secimiyle 5 gunluk hava tahmini (OpenWeather).
- Doviz donusturucu ve guncel kurlar (open.er-api.com).
- Altin/gumus gram fiyatlari (Netlify Function + MetalpriceAPI).
- Son depremler listesi, filtreleme ve tarayici bildirimleri.
- Secimler localStorage ile korunur.

## Teknoloji
- React 19, Vite 7
- Netlify Functions (metal fiyatlari icin)

## Kurulum
```bash
npm install
```

## Gelistirme
```bash
npm run dev
```

## Build
```bash
npm run build
```

## Ortam Degiskenleri
`.env` dosyasi proje kokunde beklenir. Asagidaki degiskenler kullanilir:

```bash
VITE_OPENWEATHER_API_KEY=your_key
VITE_OPENWEATHER_BASE_URL=https://api.openweathermap.org
VITE_OPENWEATHER_FORECAST_PATH=/data/2.5/forecast
VITE_OPENWEATHER_GEO_PATH=/geo/1.0/direct
VITE_TURKEY_LOCATIONS_API=https://turkiyeapi.dev/api/v1/provinces
VITE_RATES_URL=https://open.er-api.com/v6/latest
VITE_METAL_DISPLAY_CURRENCY=TRY
METALPRICE_API_KEY=your_key
```

Notlar:
- `VITE_` ile baslayan degiskenler istemcide kullanilir.
- `METALPRICE_API_KEY` sadece Netlify Function icin gereklidir.

## Netlify Function
Metal fiyatlari `/.netlify/functions/metal-prices` uzerinden servis edilir.
Kod: `netlify/functions/metal-prices.js`
