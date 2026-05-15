import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { useKnowledgeBase } from '../../hooks/useKnowledgeBase.js'
import OrgTree from '../../components/OrgTree/OrgTree.jsx'
import ActorCard from '../../components/ActorCard/ActorCard.jsx'

const FLAG = { china: '🇨🇳', russia: '🇷🇺', iran: '🇮🇷', 'north-korea': '🇰🇵' }
const OP_TYPES = ['All', 'Cyber', 'IO']

export default function CountryPage() {
  const { id } = useParams()
  const { countryById, organizations, actors } = useKnowledgeBase()
  const [filter, setFilter] = useState('All')

  const country = countryById[id]
  if (!country) return <div className="p-8 text-slate-500 font-mono">Country not found: {id}</div>

  const countryOrgs = organizations.filter(o => o.countryId === id)
  let countryActors = actors.filter(a => a.countryId === id)
  if (filter !== 'All') countryActors = countryActors.filter(a => a.opTypes?.includes(filter))

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-slate-800 p-4 flex-shrink-0">
        <h2 className="text-xs font-mono text-slate-500 uppercase mb-3">Organization Hierarchy</h2>
        <OrgTree orgs={countryOrgs} actors={actors.filter(a => a.countryId === id)} countryId={id} />
      </aside>

      <div className="flex-1 p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{FLAG[id]}</span>
          <h1 className="text-xl font-mono font-bold text-slate-100">{country.name}</h1>
          <span className="text-sm text-slate-500 font-mono ml-2">{countryActors.length} actors</span>
        </div>

        <div className="flex gap-2 mb-6">
          {OP_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-xs font-mono px-3 py-1 rounded transition-colors ${filter === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {countryActors.length === 0 ? (
          <p className="text-slate-600 font-mono text-sm">No actors found. Use AI Research to add entries.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {countryActors.map(a => <ActorCard key={a.id} actor={a} />)}
          </div>
        )}
      </div>
    </div>
  )
}
