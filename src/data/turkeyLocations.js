const TURKEY_LOCATIONS = [
  { city: 'Istanbul', districts: ['Kadikoy', 'Besiktas', 'Uskudar'] },
  { city: 'Ankara', districts: ['Cankaya', 'Kecioren', 'Sincan'] },
  { city: 'Izmir', districts: ['Konak', 'Bornova', 'Karsiyaka'] },
  { city: 'Bursa', districts: ['Osmangazi', 'Nilufer', 'Yildirim'] },
  { city: 'Antalya', districts: ['Muratpasa', 'Konyaalti', 'Kepez'] },
]

const sortedLocations = [...TURKEY_LOCATIONS].sort((a, b) =>
  a.city.localeCompare(b.city, 'tr')
)

export { sortedLocations }
