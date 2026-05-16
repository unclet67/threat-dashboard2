import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')
const DATA = join(ROOT, 'src/data')
const CTI_URL = 'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json'

export function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function extractRelationships(objects) {
  const techniqueById = {}
  for (const o of objects) {
    if (o.type === 'attack-pattern') {
      const ref = o.external_references?.find(r => r.source_name === 'mitre-attack')
      if (ref?.external_id?.startsWith('T')) techniqueById[o.id] = ref.external_id
    }
  }

  const groupToSoftware = {}
  const softwareToTechniques = {}

  for (const o of objects) {
    if (o.type !== 'relationship' || o.relationship_type !== 'uses') continue
    const { source_ref: src, target_ref: tgt } = o

    if (src.startsWith('intrusion-set--') &&
        (tgt.startsWith('malware--') || tgt.startsWith('tool--'))) {
      ;(groupToSoftware[src] ??= []).push(tgt)
    } else if (
      (src.startsWith('malware--') || src.startsWith('tool--')) &&
      techniqueById[tgt]
    ) {
      ;(softwareToTechniques[src] ??= []).push(techniqueById[tgt])
    }
  }

  return { groupToSoftware, softwareToTechniques }
}

export function mapGroup(mitreGroup, countryMap, capabilityIds) {
  const ref = mitreGroup.external_references?.find(r => r.source_name === 'mitre-attack')
  return {
    id: slugify(mitreGroup.name),
    name: mitreGroup.name,
    aliases: mitreGroup.aliases || [],
    countryId: ref ? (countryMap[ref.external_id] ?? null) : null,
    orgId: null,
    opTypes: [],
    operationIds: [],
    capabilityIds,
    description: (mitreGroup.description || '').slice(0, 300),
    confidence: 'medium',
    sources: ref?.url ? [ref.url] : [],
  }
}

export function mapSoftware(mitreSoftware, softwareToTechniques, groupsUsing) {
  return {
    id: 'cap-' + slugify(mitreSoftware.name),
    name: mitreSoftware.name,
    type: mitreSoftware.type === 'malware' ? 'implant' : 'tool',
    description: (mitreSoftware.description || '').slice(0, 300),
    mitreAttackIds: [...new Set(softwareToTechniques[mitreSoftware.id] || [])],
    actorIds: [...new Set(groupsUsing.map(g => slugify(g.name)))],
  }
}

export function mergeActor(existing, incoming) {
  return {
    ...incoming,
    orgId: existing.orgId ?? incoming.orgId,
    opTypes: existing.opTypes?.length ? existing.opTypes : incoming.opTypes,
    operationIds: existing.operationIds ?? incoming.operationIds,
    confidence: existing.confidence ?? incoming.confidence,
    description: existing.description || incoming.description,
    countryId: existing.countryId ?? incoming.countryId,
    aliases: [...new Set([...(existing.aliases || []), ...(incoming.aliases || [])])],
    capabilityIds: [...new Set([...(existing.capabilityIds || []), ...(incoming.capabilityIds || [])])],
    sources: [...new Set([...(existing.sources || []), ...(incoming.sources || [])])],
  }
}

export function mergeCapability(existing, incoming) {
  return {
    ...incoming,
    id: existing.id,
    type: existing.type || incoming.type,
    description: existing.description || incoming.description,
    mitreAttackIds: [...new Set([...(existing.mitreAttackIds || []), ...(incoming.mitreAttackIds || [])])],
    actorIds: [...new Set([...(existing.actorIds || []), ...(incoming.actorIds || [])])],
  }
}

export function makeCountryStub(countryId) {
  const name = countryId
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return { id: countryId, name, aliases: [], orgIds: [] }
}

async function fetchBundle() {
  console.log('Fetching MITRE ATT&CK enterprise bundle...')
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(CTI_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return data
    } catch (err) {
      if (attempt === 2) throw err
      console.error(`Fetch failed (${err.message}), retrying in 5s...`)
      await new Promise(r => setTimeout(r, 5000))
    }
  }
}

function readKb() {
  const readDir = subdir => {
    const dir = join(DATA, subdir)
    if (!existsSync(dir)) return {}
    return Object.fromEntries(
      readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const obj = JSON.parse(readFileSync(join(dir, f), 'utf8'))
          if (!obj.id || typeof obj.id !== 'string') {
            console.warn(`Skipping ${f}: missing or non-string id`)
            return null
          }
          return [obj.id, obj]
        })
        .filter(Boolean)
    )
  }
  return {
    actors: readDir('threat-actors'),
    capabilities: readDir('capabilities'),
    countries: readDir('countries'),
    meta: JSON.parse(readFileSync(join(DATA, 'meta.json'), 'utf8')),
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const bundle = await fetchBundle()
  const objects = bundle.objects
  const isActive = o => !o.revoked && !o.x_mitre_deprecated

  const mitreGroups = objects.filter(o => o.type === 'intrusion-set' && isActive(o))
  const allSoftware = objects.filter(
    o => (o.type === 'malware' || o.type === 'tool') && isActive(o)
  )
  const softwareById = Object.fromEntries(allSoftware.map(s => [s.id, s]))

  console.log(`Parsed ${mitreGroups.length} groups, ${allSoftware.length} software objects`)

  const { groupToSoftware, softwareToTechniques } = extractRelationships(objects)
  const countryMap = JSON.parse(readFileSync(join(__dirname, 'mitre-country-map.json'), 'utf8'))
  const kb = readKb()

  // Collect all software referenced by any group
  const relevantSoftwareIds = new Set(mitreGroups.flatMap(g => groupToSoftware[g.id] || []))

  // Build canonical capability ID map — prefer existing ID found by name match
  const softwareToCanonicalId = {}
  for (const swId of relevantSoftwareIds) {
    const sw = softwareById[swId]
    if (!sw) continue
    const generatedId = 'cap-' + slugify(sw.name)
    const byId = kb.capabilities[generatedId]
    const byName = Object.values(kb.capabilities).find(
      c => c.name.toLowerCase() === sw.name.toLowerCase()
    )
    softwareToCanonicalId[swId] = (byId || byName)?.id ?? generatedId
  }

  // --- Process groups ---
  const newActors = []
  const enrichedActors = []
  const actorWrites = {}

  for (const group of mitreGroups) {
    const capIds = [...new Set(
      (groupToSoftware[group.id] || [])
        .map(sId => softwareToCanonicalId[sId])
        .filter(Boolean)
    )]
    const incoming = mapGroup(group, countryMap, capIds)

    const byId = kb.actors[incoming.id]
    const byName = Object.values(kb.actors).find(
      a => a.name.toLowerCase() === group.name.toLowerCase()
    )
    const existing = byId || byName

    if (existing) {
      const merged = mergeActor(existing, incoming)
      const wasEnriched =
        merged.aliases.length > (existing.aliases?.length ?? 0) ||
        merged.capabilityIds.length > (existing.capabilityIds?.length ?? 0) ||
        merged.sources.length > (existing.sources?.length ?? 0)
      if (wasEnriched) {
        enrichedActors.push(existing.id)
        actorWrites[existing.id] = merged
      }
    } else {
      newActors.push(incoming.id)
      actorWrites[incoming.id] = incoming
    }
  }

  // --- Process software ---
  const newCapabilities = []
  const enrichedCapabilities = []
  const capabilityWrites = {}

  for (const swId of relevantSoftwareIds) {
    const sw = softwareById[swId]
    if (!sw) continue

    const groupsUsing = mitreGroups.filter(g => (groupToSoftware[g.id] || []).includes(swId))
    const incoming = mapSoftware(sw, softwareToTechniques, groupsUsing)

    const canonicalId = softwareToCanonicalId[swId]
    const existing =
      kb.capabilities[canonicalId] ||
      Object.values(kb.capabilities).find(c => c.name.toLowerCase() === sw.name.toLowerCase())

    if (existing) {
      const merged = mergeCapability(existing, incoming)
      const wasEnriched =
        merged.mitreAttackIds.length > (existing.mitreAttackIds?.length ?? 0) ||
        merged.actorIds.length > (existing.actorIds?.length ?? 0)
      if (wasEnriched) {
        enrichedCapabilities.push(existing.id)
        capabilityWrites[existing.id] = merged
      }
    } else {
      newCapabilities.push(incoming.id)
      capabilityWrites[incoming.id] = incoming
    }
  }

  // --- Ensure countries exist ---
  const newCountries = []
  const countryWrites = {}
  const allCountryIds = new Set(
    Object.values(actorWrites).map(a => a.countryId).filter(Boolean)
  )
  for (const countryId of allCountryIds) {
    if (!kb.countries[countryId]) {
      newCountries.push(countryId)
      countryWrites[countryId] = makeCountryStub(countryId)
    }
  }

  // --- Report ---
  console.log('')
  if (newActors.length)
    console.log(`NEW actors       (${newActors.length}): ${newActors.join(', ')}`)
  if (enrichedActors.length)
    console.log(`ENRICHED actors  (${enrichedActors.length}): ${enrichedActors.join(', ')}`)
  if (enrichedCapabilities.length)
    console.log(`ENRICHED caps    (${enrichedCapabilities.length}): ${enrichedCapabilities.join(', ')}`)
  if (newCapabilities.length)
    console.log(`NEW capabilities (${newCapabilities.length}): ${newCapabilities.join(', ')}`)
  if (newCountries.length)
    console.log(`NEW countries    (${newCountries.length}): ${newCountries.join(', ')}`)
  if (!newActors.length && !enrichedActors.length && !enrichedCapabilities.length && !newCapabilities.length && !newCountries.length)
    console.log('No changes detected.')

  if (dryRun) {
    console.log('\n[dry-run] No files written.')
    return
  }

  // --- Write files ---
  const write = (subdir, id, data) => {
    const dir = join(DATA, subdir)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, `${id}.json`), JSON.stringify(data, null, 2) + '\n')
  }

  for (const [id, data] of Object.entries(actorWrites)) write('threat-actors', id, data)
  for (const [id, data] of Object.entries(capabilityWrites)) write('capabilities', id, data)
  for (const [id, data] of Object.entries(countryWrites)) write('countries', id, data)

  // Update meta.json
  const today = new Date().toISOString().slice(0, 10)
  const newAdditions = [
    ...newActors.map(id => ({ type: 'actor', id, name: actorWrites[id].name, addedAt: today })),
    ...newCapabilities.map(id => ({
      type: 'capability',
      id,
      name: capabilityWrites[id].name,
      addedAt: today,
    })),
  ]
  const updatedMeta = {
    ...kb.meta,
    lastSynced: new Date().toISOString(),
    recentAdditions: [...newAdditions, ...(kb.meta.recentAdditions || [])],
  }
  writeFileSync(join(DATA, 'meta.json'), JSON.stringify(updatedMeta, null, 2) + '\n')

  console.log('\nSync complete.')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err?.message ?? err)
    process.exit(1)
  })
}
