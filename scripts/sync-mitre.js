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
