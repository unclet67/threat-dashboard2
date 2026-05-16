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
