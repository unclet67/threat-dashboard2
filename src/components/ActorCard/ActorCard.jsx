import { Link } from 'react-router-dom'

const CONFIDENCE_COLOR = { high: 'text-green-400', medium: 'text-yellow-400', low: 'text-red-400' }
const OP_TYPE_COLOR = { Cyber: 'bg-blue-900 text-blue-300', IO: 'bg-purple-900 text-purple-300' }

export default function ActorCard({ actor }) {
  return (
    <Link
      to={`/actor/${actor.id}`}
      className="block bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-blue-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-mono font-bold text-slate-100">{actor.name}</h3>
        <span className={`text-xs font-mono uppercase ${CONFIDENCE_COLOR[actor.confidence] ?? 'text-slate-500'}`}>
          {actor.confidence}
        </span>
      </div>
      {actor.aliases?.length > 0 && (
        <p className="text-xs text-slate-500 font-mono mb-2">{actor.aliases.join(' · ')}</p>
      )}
      <div className="flex gap-2 mb-3">
        {actor.opTypes?.map(t => (
          <span key={t} className={`text-xs px-2 py-0.5 rounded font-mono ${OP_TYPE_COLOR[t] ?? 'bg-slate-800 text-slate-400'}`}>
            {t}
          </span>
        ))}
      </div>
      <p className="text-xs text-slate-500 line-clamp-2">{actor.description}</p>
      <p className="text-xs text-slate-600 font-mono mt-2">{actor.operationIds?.length ?? 0} operations</p>
    </Link>
  )
}
