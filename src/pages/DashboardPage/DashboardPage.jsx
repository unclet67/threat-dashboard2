import { Link, useSearchParams } from 'react-router-dom'
import { useKnowledgeBase } from '../../hooks/useKnowledgeBase.js'

const FLAG = { china: '🇨🇳', russia: '🇷🇺', iran: '🇮🇷', 'north-korea': '🇰🇵' }

function CountryCard({ country, actorCount, opCount }) {
  return (
    <Link
      to={`/country/${country.id}`}
      className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-600 transition-colors flex flex-col items-center gap-3"
    >
      <span className="text-4xl">{FLAG[country.id]}</span>
      <h2 className="font-mono font-bold text-slate-100 text-lg">{country.name}</h2>
      <div className="flex gap-4 text-xs font-mono text-slate-500">
        <span>{actorCount} {actorCount === 1 ? 'actor' : 'actors'}</span>
        <span>{opCount} ops</span>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { countries, actors, operations, search } = useKnowledgeBase()
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const results = search(query)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-mono font-bold text-slate-100 mb-2">
        Information Warfare Research
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        China · Russia · Iran · North Korea — IO + Cyberspace Operations
      </p>

      {query && (
        <div className="mb-8">
          <h2 className="text-sm font-mono text-slate-400 mb-3">Search: "{query}"</h2>
          {results.length === 0 ? (
            <p className="text-slate-600 text-sm">No results found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {results.map(r => (
                <Link key={r.id} to={r.url} className="text-sm text-blue-400 hover:text-blue-300 font-mono">
                  [{r.type}] {r.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-10">
        {countries.map(c => (
          <CountryCard
            key={c.id}
            country={c}
            actorCount={actors.filter(a => a.countryId === c.id).length}
            opCount={operations.filter(o => {
              const actor = actors.find(a => a.id === o.adversaryId)
              return actor?.countryId === c.id
            }).length}
          />
        ))}
      </div>

      <div className="flex gap-4">
        <Link to="/research" className="bg-blue-900 hover:bg-blue-800 text-blue-300 font-mono text-sm px-4 py-2 rounded transition-colors">
          ⚗ AI Research
        </Link>
        <Link to="/analytics" className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-sm px-4 py-2 rounded transition-colors">
          📊 Analytics
        </Link>
      </div>
    </div>
  )
}
