let techniques = null

export async function loadMitreTechniques() {
  if (techniques) return techniques
  const res = await fetch('/mitre-techniques.json')
  techniques = await res.json()
  return techniques
}

export function searchTechniques(query, allTechniques) {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase()
  return allTechniques
    .filter(t => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
    .slice(0, 8)
}

export function getTechniqueUrl(id) {
  return `https://attack.mitre.org/techniques/${id}/`
}
