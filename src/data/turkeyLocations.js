const sortedLocations = [...TURKEY_LOCATIONS].sort((a, b) =>
  a.city.localeCompare(b.city, 'tr')
)

export { sortedLocations }
