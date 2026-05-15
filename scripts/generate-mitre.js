// Run once: node scripts/generate-mitre.js
import { writeFileSync } from 'fs'

const CTI_URL = 'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json'

async function main() {
  console.log('Fetching MITRE ATT&CK enterprise matrix...')
  const res = await fetch(CTI_URL)
  const data = await res.json()

  const techniques = data.objects
    .filter(o => o.type === 'attack-pattern' && !o.revoked && !o.x_mitre_deprecated)
    .map(o => {
      const extRef = o.external_references?.find(r => r.source_name === 'mitre-attack')
      return {
        id: extRef?.external_id ?? '',
        name: o.name,
        tactic: o.kill_chain_phases?.[0]?.phase_name ?? '',
        description: (o.description ?? '').slice(0, 200),
      }
    })
    .filter(t => t.id.startsWith('T'))
    .sort((a, b) => a.id.localeCompare(b.id))

  writeFileSync('public/mitre-techniques.json', JSON.stringify(techniques, null, 2))
  console.log(`Wrote ${techniques.length} techniques to public/mitre-techniques.json`)
}

main()
