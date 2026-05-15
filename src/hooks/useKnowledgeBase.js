import { useMemo } from 'react'
import { loadKnowledgeBase, writeKbEntry } from '../utils/dataLoader.js'

export function useKnowledgeBase() {
  const kb = useMemo(() => loadKnowledgeBase(), [])

  function search(query) {
    if (!query) return []
    const q = query.toLowerCase()
    const actorHits = kb.actors.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.aliases ?? []).some(al => al.toLowerCase().includes(q))
    ).map(a => ({ type: 'actor', id: a.id, label: a.name, url: `/actor/${a.id}` }))

    const opHits = kb.operations.filter(o =>
      o.name.toLowerCase().includes(q)
    ).map(o => ({ type: 'operation', id: o.id, label: o.name, url: `/operation/${o.id}` }))

    return [...actorHits, ...opHits].slice(0, 10)
  }

  return { ...kb, search, writeKbEntry }
}
