const TROY_OUNCE_IN_GRAMS = 31.1034768

const buildMetalpriceUrl = (base, quote, apiKey) => {
  const params = new URLSearchParams({
    api_key: apiKey,
    base,
    currencies: quote,
  })
  return `https://api.metalpriceapi.com/v1/latest?${params.toString()}`
}

exports.handler = async (event) => {
  try {
    const apiKey = process.env.METALPRICE_API_KEY
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Metalprice API anahtari bulunamadi.' }),
      }
    }

    const currency =
      event.queryStringParameters?.currency?.toUpperCase() || 'TRY'
    if (!/^[A-Z]{3}$/.test(currency)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Gecersiz para birimi.' }),
      }
    }

    const [goldResponse, silverResponse] = await Promise.all([
      fetch(buildMetalpriceUrl('XAU', currency, apiKey)),
      fetch(buildMetalpriceUrl('XAG', currency, apiKey)),
    ])

    if (!goldResponse.ok || !silverResponse.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Altin/gumus verisi alinamadi.' }),
      }
    }

    const [goldPayload, silverPayload] = await Promise.all([
      goldResponse.json(),
      silverResponse.json(),
    ])

    if (goldPayload.success === false || silverPayload.success === false) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Altin/gumus verisi alinamadi.' }),
      }
    }

    const goldRate = goldPayload.rates?.[currency]
    const silverRate = silverPayload.rates?.[currency]
    if (!goldRate || !silverRate) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Altin/gumus kurlari bulunamadi.' }),
      }
    }

    const metalDate = goldPayload.date
      ? new Date(goldPayload.date).toLocaleDateString('tr-TR')
      : goldPayload.timestamp
      ? new Date(goldPayload.timestamp * 1000).toLocaleDateString('tr-TR')
      : null

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        goldGram: goldRate / TROY_OUNCE_IN_GRAMS,
        silverGram: silverRate / TROY_OUNCE_IN_GRAMS,
        date: metalDate,
        source: 'MetalpriceAPI',
      }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Altin/gumus verisi alinamadi.' }),
    }
  }
}
