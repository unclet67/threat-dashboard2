const countryModules = import.meta.glob('../data/countries/*.json', { eager: true })
const orgModules = import.meta.glob('../data/organizations/*.json', { eager: true })
const actorModules = import.meta.glob('../data/threat-actors/*.json', { eager: true })
const operationModules = import.meta.glob('../data/operations/*.json', { eager: true })
const capabilityModules = import.meta.glob('../data/capabilities/*.json', { eager: true })

function extractAll(modules) {
  return Object.values(modules).map(m => m.default ?? m)
}

export function loadKnowledgeBase() {
  const countries = extractAll(countryModules)
  const organizations = extractAll(orgModules)
  const actors = extractAll(actorModules)
  const operations = extractAll(operationModules)
  const capabilities = extractAll(capabilityModules)

  return {
    countries,
    organizations,
    actors,
    operations,
    capabilities,
    countryById: Object.fromEntries(countries.map(c => [c.id, c])),
    orgById: Object.fromEntries(organizations.map(o => [o.id, o])),
    actorById: Object.fromEntries(actors.map(a => [a.id, a])),
    operationById: Object.fromEntries(operations.map(o => [o.id, o])),
    capabilityById: Object.fromEntries(capabilities.map(c => [c.id, c])),
  }
}

export async function writeKbEntry(relativePath, data) {
  const res = await fetch('/api/kb/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: relativePath, data }),
  })
  if (!res.ok) throw new Error(`KB write failed: ${res.status}`)
  return res.json()
}
