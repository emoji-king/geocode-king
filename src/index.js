var Promise = require('bluebird')
import request from 'superagent-bluebird-promise'

const DEFAULT_OPTIONS = {
  useCachedQueries: true,
  useCensus: true,
  useMapbox: true,
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, milliseconds)
  })
}

class GeocodeKing {
  constructor(options) {
    this.opts = {...DEFAULT_OPTIONS, ...(options || {})}
    this.cachedQueries = {}
    this.mapboxLastGeocode = Date.now()
  }

  async geocode(query, options) {
    const opts = {...this.opts, ...(options || {})}
    const q = query.toLowerCase().trim()

    if (this.opts.useCachedQueries && this.cachedQueries[q]) {
      return this.cachedQueries[q]
    }

    if (opts.useCensus) {
      try {
        const res = await request('http://geocoding.geo.census.gov/geocoder/locations/onelineaddress').query({address: q, benchmark: 9, format: 'json'}).set('Accept', 'application/json')
        return this.cachedQueries[q] =
          {lat: res.body.result.addressMatches[0].coordinates.y,
           lon: res.body.result.addressMatches[0].coordinates.x}
      } catch (err) {
        // Error, so ignore to fall through.
      }
    }

    if (opts.useMapbox) {
      try {
        // Throttle the calls.
        const diff = Date.now() - this.mapboxLastGeocode
        this.mapboxLastGeocode = Date.now()
        if (diff < 100) {
          await sleep(100-diff)
        }
        const res = await request(`http://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`).query({...opts.mapbox})
        console.log(JSON.stringify(res.body))
        return this.cachedQueries[q] =
          {lat: res.body.features[0].center[1],
           lon: res.body.features[0].center[0]}
      } catch(err) {
        // Error, so ignore to fall through.
        console.log(err)
      }
    }
  }
}

async function test() {
  const gk = new GeocodeKing({mapbox: {access_token: '', country: 'US,CA', proxmity: '-122.431297,37.7749'}})

  console.log(`${JSON.stringify(await gk.geocode("Terra Cotta Fremont ca"))}`)
  console.log(`${JSON.stringify(await gk.geocode("sf"))}`)
  console.log(`${JSON.stringify(await gk.geocode("japantown"))}`)
  console.log(`${JSON.stringify(await gk.geocode("all US"))}`)
}
