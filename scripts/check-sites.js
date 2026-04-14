// scripts/check-sites.js
// Run: node --env-file=.env scripts/check-sites.js

const RETAILCRM_URL = process.env.RETAILCRM_URL
const RETAILCRM_API_KEY = process.env.RETAILCRM_API_KEY

// Correct endpoint is /reference/sites, not /sites
const res = await fetch(`${RETAILCRM_URL}/api/v5/reference/sites?apiKey=${RETAILCRM_API_KEY}`)
const data = await res.json()

if (!data.success) {
  console.error('API error:', data.errorMsg)
  console.error('Full response:', JSON.stringify(data, null, 2))
  process.exit(1)
}

console.log('Your sites:')
for (const [code, site] of Object.entries(data.sites)) {
  console.log(`  code: "${code}" — name: "${site.name}"`)
}
