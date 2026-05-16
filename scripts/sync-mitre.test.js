// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  slugify,
  extractRelationships,
  mapGroup,
  mapSoftware,
  mergeActor,
  mergeCapability,
  makeCountryStub,
} from './sync-mitre.js'

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

  it('preserves existing id even when incoming has a different slug', () => {
    const merged = mergeActor(existing, { ...incoming, id: 'apt28-different-slug' })
    expect(merged.id).toBe('apt28')
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
