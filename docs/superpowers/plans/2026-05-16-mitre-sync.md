# MITRE ATT&CK Sync Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a script that fetches the MITRE ATT&CK enterprise bundle and syncs Groups → threat-actors and Software → capabilities into the KB JSON files, with a GitHub Actions workflow that runs it weekly and opens a PR when changes are detected.

**Architecture:** A single ESM Node.js script (`scripts/sync-mitre.js`) exports pure mapping/merge functions (testable) and an async `main()` that handles I/O. A static `scripts/mitre-country-map.json` maps MITRE Group IDs to country slugs. The GitHub Actions workflow calls the same script via cron and uses `peter-evans/create-pull-request` to open PRs for review.

**Tech Stack:** Node 20 built-ins only (`fs`, `path`, `url`, native `fetch`) — no new npm dependencies. Tests via Vitest (already in the project).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `scripts/mitre-country-map.json` | Create | Static MITRE Group ID → country slug lookup |
| `scripts/sync-mitre.js` | Create | All pure functions + I/O + main() orchestrator |
| `scripts/sync-mitre.test.js` | Create | Vitest unit tests for all pure functions |
| `.github/workflows/sync-mitre.yml` | Create | Weekly cron + manual trigger + PR creation |
| `package.json` | Modify | Add `"sync": "node scripts/sync-mitre.js"` script |

---

## Task 1: Country Map

**Files:**
- Create: `scripts/mitre-country-map.json`

- [ ] **Step 1: Create the static country attribution lookup**

```json
{
  "G0007": "russia",
  "G0016": "russia",
  "G0034": "russia",
  "G0010": "russia",
  "G0035": "russia",
  "G0088": "russia",
  "G0006": "china",
  "G0022": "china",
  "G0026": "china",
  "G0027": "china",
  "G0030": "china",
  "G0045": "china",
  "G0065": "china",
  "G0096": "china",
  "G0032": "north-korea",
  "G0082": "north-korea",
  "G0094": "north-korea",
  "G0003": "iran",
  "G0049": "iran",
  "G0059": "iran",
  "G0064": "iran",
  "G0069": "iran",
  "G0050": "vietnam"
}
```

Write this to `scripts/mitre-country-map.json`.

- [ ] **Step 2: Commit**

```bash
git add scripts/mitre-country-map.json
git commit -m "feat: add MITRE country attribution map"
```

---

## Task 2: Test Scaffold + slugify + extractRelationships

**Files:**
- Create: `scripts/sync-mitre.test.js`
- Create: `scripts/sync-mitre.js` (initial — exports only, no main yet)

- [ ] **Step 1: Write failing tests**

Create `scripts/sync-mitre.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { slugify, extractRelationships } from './sync-mitre.js'

describe('slugify', () => {
  it('lowercases and replaces non-alphanumeric with hyphens', () => {
    expect(slugify('APT28')).toBe('apt28')
    expect(slugify('Lazarus Group')).toBe('lazarus-group')
    expect(slugify('TEMP.Veles')).toBe('temp-veles')
    expect(slugify('MuddyWater')).toBe('muddywater')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugify(' APT28 ')).toBe('apt28')
  })
})

describe('extractRelationships', () => {
  it('maps group→software uses relationships', () => {
    const objects = [
      {
        type: 'relationship',
        relationship_type: 'uses',
        source_ref: 'intrusion-set--abc',
        target_ref: 'malware--xyz',
      },
    ]
    const { groupToSoftware } = extractRelationships(objects)
    expect(groupToSoftware['intrusion-set--abc']).toEqual(['malware--xyz'])
  })

  it('maps group→tool uses relationships', () => {
    const objects = [
      {
        type: 'relationship',
        relationship_type: 'uses',
        source_ref: 'intrusion-set--abc',
        target_ref: 'tool--xyz',
      },
    ]
    const { groupToSoftware } = extractRelationships(objects)
    expect(groupToSoftware['intrusion-set--abc']).toEqual(['tool--xyz'])
  })

  it('maps software→technique uses relationships', () => {
    const objects = [
      {
        type: 'attack-pattern',
        id: 'attack-pattern--111',
        external_references: [{ source_name: 'mitre-attack', external_id: 'T1059' }],
      },
      {
        type: 'relationship',
        relationship_type: 'uses',
        source_ref: 'malware--xyz',
        target_ref: 'attack-pattern--111',
      },
    ]
    const { softwareToTechniques } = extractRelationships(objects)
    expect(softwareToTechniques['malware--xyz']).toEqual(['T1059'])
  })

  it('ignores non-uses relationship types', () => {
    const objects = [
      {
        type: 'relationship',
        relationship_type: 'subtechnique-of',
        source_ref: 'intrusion-set--abc',
        target_ref: 'malware--xyz',
      },
    ]
    const { groupToSoftware } = extractRelationships(objects)
    expect(groupToSoftware['intrusion-set--abc']).toBeUndefined()
  })

  it('returns empty maps when no relevant relationships exist', () => {
    const { groupToSoftware, softwareToTechniques } = extractRelationships([])
    expect(groupToSoftware).toEqual({})
    expect(softwareToTechniques).toEqual({})
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run scripts/sync-mitre.test.js
```

Expected: FAIL with "Cannot find module './sync-mitre.js'"

- [ ] **Step 3: Create sync-mitre.js with slugify + extractRelationships**

Create `scripts/sync-mitre.js`:

```js
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run scripts/sync-mitre.test.js
```

Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-mitre.js scripts/sync-mitre.test.js
git commit -m "feat: add slugify and extractRelationships with tests"
```

---

## Task 3: mapGroup + mapSoftware

**Files:**
- Modify: `scripts/sync-mitre.test.js` (add tests)
- Modify: `scripts/sync-mitre.js` (add functions)

- [ ] **Step 1: Add failing tests for mapGroup and mapSoftware**

Append to `scripts/sync-mitre.test.js`:

```js
import { slugify, extractRelationships, mapGroup, mapSoftware } from './sync-mitre.js'

// ... existing tests above ...

describe('mapGroup', () => {
  const countryMap = { 'G0007': 'russia' }
  const group = {
    id: 'intrusion-set--abc',
    type: 'intrusion-set',
    name: 'APT28',
    aliases: ['Fancy Bear', 'STRONTIUM'],
    description: 'GRU-linked actor.',
    external_references: [
      {
        source_name: 'mitre-attack',
        external_id: 'G0007',
        url: 'https://attack.mitre.org/groups/G0007/',
      },
    ],
  }

  it('slugifies name to id', () => {
    const actor = mapGroup(group, countryMap, [])
    expect(actor.id).toBe('apt28')
  })

  it('maps name, aliases, and sources', () => {
    const actor = mapGroup(group, countryMap, [])
    expect(actor.name).toBe('APT28')
    expect(actor.aliases).toEqual(['Fancy Bear', 'STRONTIUM'])
    expect(actor.sources).toEqual(['https://attack.mitre.org/groups/G0007/'])
  })

  it('resolves countryId from map using external_id', () => {
    const actor = mapGroup(group, countryMap, [])
    expect(actor.countryId).toBe('russia')
  })

  it('sets countryId to null when group not in map', () => {
    const actor = mapGroup({ ...group, external_references: [] }, countryMap, [])
    expect(actor.countryId).toBeNull()
  })

  it('passes through provided capabilityIds', () => {
    const actor = mapGroup(group, countryMap, ['cap-xagent', 'cap-sofacy'])
    expect(actor.capabilityIds).toEqual(['cap-xagent', 'cap-sofacy'])
  })

  it('truncates description to 300 chars', () => {
    const actor = mapGroup({ ...group, description: 'x'.repeat(400) }, countryMap, [])
    expect(actor.description.length).toBe(300)
  })

  it('sets default scaffold fields', () => {
    const actor = mapGroup(group, countryMap, [])
    expect(actor.orgId).toBeNull()
    expect(actor.opTypes).toEqual([])
    expect(actor.operationIds).toEqual([])
    expect(actor.confidence).toBe('medium')
  })
})

describe('mapSoftware', () => {
  const malware = {
    id: 'malware--xyz',
    type: 'malware',
    name: 'RATANKBA',
    description: 'A remote access tool used by Lazarus.',
  }
  const tool = { ...malware, id: 'tool--xyz', type: 'tool', name: 'Mimikatz' }
  const softwareToTechniques = { 'malware--xyz': ['T1055', 'T1059'] }
  const groupsUsing = [{ name: 'Lazarus Group' }, { name: 'APT38' }]

  it('prefixes id with cap- and slugifies name', () => {
    const cap = mapSoftware(malware, softwareToTechniques, groupsUsing)
    expect(cap.id).toBe('cap-ratankba')
  })

  it('maps malware type to implant', () => {
    const cap = mapSoftware(malware, softwareToTechniques, groupsUsing)
    expect(cap.type).toBe('implant')
  })

  it('maps tool type to tool', () => {
    const cap = mapSoftware(tool, {}, groupsUsing)
    expect(cap.type).toBe('tool')
  })

  it('populates mitreAttackIds from softwareToTechniques', () => {
    const cap = mapSoftware(malware, softwareToTechniques, groupsUsing)
    expect(cap.mitreAttackIds).toEqual(['T1055', 'T1059'])
  })

  it('populates actorIds from groups using the software', () => {
    const cap = mapSoftware(malware, softwareToTechniques, groupsUsing)
    expect(cap.actorIds).toEqual(['lazarus-group', 'apt38'])
  })

  it('deduplicates actorIds', () => {
    const cap = mapSoftware(malware, softwareToTechniques, [
      { name: 'Lazarus Group' },
      { name: 'Lazarus Group' },
    ])
    expect(cap.actorIds).toEqual(['lazarus-group'])
  })

  it('truncates description to 300 chars', () => {
    const cap = mapSoftware({ ...malware, description: 'x'.repeat(400) }, {}, groupsUsing)
    expect(cap.description.length).toBe(300)
  })
})
```

Also update the import line at the top of the test file to include `mapGroup, mapSoftware`:

```js
import { slugify, extractRelationships, mapGroup, mapSoftware } from './sync-mitre.js'
```

- [ ] **Step 2: Run tests to confirm the new ones fail**

```bash
npx vitest run scripts/sync-mitre.test.js
```

Expected: FAIL — `mapGroup is not a function`, `mapSoftware is not a function`

- [ ] **Step 3: Add mapGroup and mapSoftware to sync-mitre.js**

Append after `extractRelationships` in `scripts/sync-mitre.js`:

```js
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
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npx vitest run scripts/sync-mitre.test.js
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-mitre.js scripts/sync-mitre.test.js
git commit -m "feat: add mapGroup and mapSoftware with tests"
```

---

## Task 4: mergeActor + mergeCapability + makeCountryStub

**Files:**
- Modify: `scripts/sync-mitre.test.js` (add tests)
- Modify: `scripts/sync-mitre.js` (add functions)

- [ ] **Step 1: Add failing tests**

Update the import line at the top of `scripts/sync-mitre.test.js`:

```js
import {
  slugify,
  extractRelationships,
  mapGroup,
  mapSoftware,
  mergeActor,
  mergeCapability,
  makeCountryStub,
} from './sync-mitre.js'
```

Append to `scripts/sync-mitre.test.js`:

```js
describe('mergeActor', () => {
  const existing = {
    id: 'apt28',
    name: 'APT28',
    aliases: ['Fancy Bear'],
    countryId: 'russia',
    orgId: 'gru',
    opTypes: ['Cyber'],
    operationIds: ['op-ru-001'],
    capabilityIds: ['cap-xagent'],
    description: 'Hand-written description.',
    confidence: 'high',
    sources: ['https://existing.example.com'],
  }
  const incoming = {
    id: 'apt28',
    name: 'APT28',
    aliases: ['STRONTIUM', 'Sofacy'],
    countryId: 'russia',
    orgId: null,
    opTypes: [],
    operationIds: [],
    capabilityIds: ['cap-x-agent', 'cap-xagent'],
    description: 'MITRE description.',
    confidence: 'medium',
    sources: ['https://attack.mitre.org/groups/G0007/'],
  }

  it('union-merges aliases without duplicates', () => {
    const merged = mergeActor(existing, incoming)
    expect(merged.aliases).toContain('Fancy Bear')
    expect(merged.aliases).toContain('STRONTIUM')
    expect(merged.aliases).toContain('Sofacy')
  })

  it('union-merges capabilityIds and deduplicates', () => {
    const merged = mergeActor(existing, incoming)
    expect(merged.capabilityIds).toContain('cap-xagent')
    expect(merged.capabilityIds).toContain('cap-x-agent')
    expect(merged.capabilityIds.filter(id => id === 'cap-xagent').length).toBe(1)
  })

  it('union-merges sources', () => {
    const merged = mergeActor(existing, incoming)
    expect(merged.sources).toContain('https://existing.example.com')
    expect(merged.sources).toContain('https://attack.mitre.org/groups/G0007/')
  })

  it('preserves orgId from existing', () => {
    const merged = mergeActor(existing, incoming)
    expect(merged.orgId).toBe('gru')
  })

  it('preserves opTypes from existing when non-empty', () => {
    const merged = mergeActor(existing, incoming)
    expect(merged.opTypes).toEqual(['Cyber'])
  })

  it('preserves operationIds from existing', () => {
    const merged = mergeActor(existing, incoming)
    expect(merged.operationIds).toEqual(['op-ru-001'])
  })

  it('preserves confidence from existing', () => {
    const merged = mergeActor(existing, incoming)
    expect(merged.confidence).toBe('high')
  })

  it('preserves existing description when non-empty', () => {
    const merged = mergeActor(existing, incoming)
    expect(merged.description).toBe('Hand-written description.')
  })

  it('uses incoming description when existing is empty', () => {
    const merged = mergeActor({ ...existing, description: '' }, incoming)
    expect(merged.description).toBe('MITRE description.')
  })

  it('preserves existing countryId when set', () => {
    const merged = mergeActor(existing, { ...incoming, countryId: 'china' })
    expect(merged.countryId).toBe('russia')
  })
})

describe('mergeCapability', () => {
  const existing = {
    id: 'cap-xagent',
    name: 'X-Agent',
    type: 'implant',
    description: 'Existing description.',
    mitreAttackIds: ['T1055'],
    actorIds: ['apt28'],
  }
  const incoming = {
    id: 'cap-x-agent',
    name: 'X-Agent',
    type: 'implant',
    description: 'MITRE description.',
    mitreAttackIds: ['T1059', 'T1055'],
    actorIds: ['apt28', 'sandworm'],
  }

  it('always preserves existing id', () => {
    const merged = mergeCapability(existing, incoming)
    expect(merged.id).toBe('cap-xagent')
  })

  it('union-merges mitreAttackIds without duplicates', () => {
    const merged = mergeCapability(existing, incoming)
    expect(merged.mitreAttackIds).toContain('T1055')
    expect(merged.mitreAttackIds).toContain('T1059')
    expect(merged.mitreAttackIds.filter(id => id === 'T1055').length).toBe(1)
  })

  it('union-merges actorIds', () => {
    const merged = mergeCapability(existing, incoming)
    expect(merged.actorIds).toContain('apt28')
    expect(merged.actorIds).toContain('sandworm')
  })

  it('preserves existing description when non-empty', () => {
    const merged = mergeCapability(existing, incoming)
    expect(merged.description).toBe('Existing description.')
  })

  it('uses incoming description when existing is empty', () => {
    const merged = mergeCapability({ ...existing, description: '' }, incoming)
    expect(merged.description).toBe('MITRE description.')
  })

  it('preserves existing type when set', () => {
    const merged = mergeCapability(existing, { ...incoming, type: 'tool' })
    expect(merged.type).toBe('implant')
  })
})

describe('makeCountryStub', () => {
  it('capitalizes a single-word slug', () => {
    expect(makeCountryStub('vietnam')).toEqual({
      id: 'vietnam',
      name: 'Vietnam',
      aliases: [],
      orgIds: [],
    })
  })

  it('capitalizes each word in a hyphenated slug', () => {
    expect(makeCountryStub('north-korea')).toEqual({
      id: 'north-korea',
      name: 'North Korea',
      aliases: [],
      orgIds: [],
    })
  })

  it('handles multiple hyphens', () => {
    expect(makeCountryStub('saudi-arabia')).toEqual({
      id: 'saudi-arabia',
      name: 'Saudi Arabia',
      aliases: [],
      orgIds: [],
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm the new ones fail**

```bash
npx vitest run scripts/sync-mitre.test.js
```

Expected: FAIL — `mergeActor is not a function`, etc.

- [ ] **Step 3: Add the three functions to sync-mitre.js**

Append after `mapSoftware` in `scripts/sync-mitre.js`:

```js
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
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npx vitest run scripts/sync-mitre.test.js
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-mitre.js scripts/sync-mitre.test.js
git commit -m "feat: add mergeActor, mergeCapability, makeCountryStub with tests"
```

---

## Task 5: I/O Functions + Main Orchestrator

**Files:**
- Modify: `scripts/sync-mitre.js` (add fetchBundle, readKb, main)

No unit tests here — these functions do file/network I/O. Verified via `--dry-run`.

- [ ] **Step 1: Add fetchBundle and readKb to sync-mitre.js**

Append after `makeCountryStub` in `scripts/sync-mitre.js`:

```js
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
          return [obj.id, obj]
        })
    )
  }
  return {
    actors: readDir('threat-actors'),
    capabilities: readDir('capabilities'),
    countries: readDir('countries'),
    meta: JSON.parse(readFileSync(join(DATA, 'meta.json'), 'utf8')),
  }
}
```

- [ ] **Step 2: Add main() to sync-mitre.js**

Append after `readKb` in `scripts/sync-mitre.js`:

```js
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
      if (wasEnriched) capabilityWrites[existing.id] = merged
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
  if (newCapabilities.length)
    console.log(`NEW capabilities (${newCapabilities.length}): ${newCapabilities.join(', ')}`)
  if (newCountries.length)
    console.log(`NEW countries    (${newCountries.length}): ${newCountries.join(', ')}`)
  if (!newActors.length && !enrichedActors.length && !newCapabilities.length && !newCountries.length)
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
    console.error(err.message)
    process.exit(1)
  })
}
```

- [ ] **Step 3: Verify existing tests still pass**

```bash
npx vitest run scripts/sync-mitre.test.js
```

Expected: all tests PASS

- [ ] **Step 4: Verify dry-run works end-to-end**

```bash
node scripts/sync-mitre.js --dry-run
```

Expected output (similar to):
```
Fetching MITRE ATT&CK enterprise bundle...
Parsed 133 groups, 680 software objects

NEW actors       (N): ...
NEW capabilities (N): ...

[dry-run] No files written.
```

If the fetch fails (no internet), the retry logic fires, then exits with an error — that is correct behavior.

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-mitre.js
git commit -m "feat: add I/O functions and main orchestrator to sync-mitre"
```

---

## Task 6: npm Script + GitHub Actions Workflow

**Files:**
- Modify: `package.json`
- Create: `.github/workflows/sync-mitre.yml`

- [ ] **Step 1: Add sync script to package.json**

In `package.json`, add `"sync"` to the `"scripts"` block:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest",
  "test:run": "vitest run",
  "sync": "node scripts/sync-mitre.js"
}
```

- [ ] **Step 2: Verify the npm script works**

```bash
npm run sync -- --dry-run
```

Expected: same output as `node scripts/sync-mitre.js --dry-run`

- [ ] **Step 3: Create the GitHub Actions workflow directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 4: Create .github/workflows/sync-mitre.yml**

```yaml
name: Sync MITRE ATT&CK

on:
  schedule:
    - cron: '0 6 * * 1'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run sync script
        run: node scripts/sync-mitre.js | tee /tmp/sync-output.txt

      - name: Read sync output
        id: sync_out
        run: |
          {
            echo 'body<<EOF'
            cat /tmp/sync-output.txt
            echo EOF
          } >> "$GITHUB_OUTPUT"

      - name: Get current date
        id: date
        run: echo "date=$(date +'%Y-%m-%d')" >> "$GITHUB_OUTPUT"

      - uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'chore: sync MITRE ATT&CK data'
          branch: mitre-sync/auto
          delete-branch: false
          title: 'chore: sync MITRE ATT&CK – ${{ steps.date.outputs.date }}'
          body: |
            Automated weekly MITRE ATT&CK sync.

            ```
            ${{ steps.sync_out.outputs.body }}
            ```

            ---
            *Generated by [sync-mitre.yml](.github/workflows/sync-mitre.yml)*
```

- [ ] **Step 5: Commit everything**

```bash
git add package.json .github/workflows/sync-mitre.yml
git commit -m "feat: add npm sync script and GitHub Actions weekly workflow"
```

---

## Self-Review Checklist

- [x] **Country map** (Task 1) ✓
- [x] **slugify** (Task 2) — tested ✓
- [x] **extractRelationships** (Task 2) — tested ✓
- [x] **mapGroup** (Task 3) — tested, receives pre-resolved capabilityIds ✓
- [x] **mapSoftware** (Task 3) — tested ✓
- [x] **mergeActor** (Task 4) — tested, all protected fields covered ✓
- [x] **mergeCapability** (Task 4) — tested, existing ID always preserved ✓
- [x] **makeCountryStub** (Task 4) — tested ✓
- [x] **fetchBundle with retry** (Task 5) ✓
- [x] **readKb** (Task 5) ✓
- [x] **main orchestrator with dry-run** (Task 5) ✓
- [x] **Canonical ID map for name-collision handling** (Task 5) ✓
- [x] **npm sync script** (Task 6) ✓
- [x] **GitHub Actions workflow** (Task 6) ✓
- [x] **meta.json lastSynced + recentAdditions** (Task 5) ✓
- [x] **Country stub auto-creation** (Task 5) ✓
- [x] **No new npm dependencies** ✓
