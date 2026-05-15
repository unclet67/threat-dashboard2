import { Link } from 'react-router-dom'

const OP_TYPE_COLOR = { Cyber: 'bg-blue-900 text-blue-300', IO: 'bg-purple-900 text-purple-300' }
const CONF_COLOR = { high: 'text-green-400', medium: 'text-yellow-400', low: 'text-red-400' }

export default function OperationCard({ operation, actor, capability }) {
  return (
    <Link
      to={`/operation/${operation.id}`}
      className="block bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-blue-600 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded font-mono ${OP_TYPE_COLOR[operation.opType] ?? 'bg-slate-800 text-slate-400'}`}>
          {operation.opType}
        </span>
        <span className={`text-xs font-mono ml-auto ${CONF_COLOR[operation.confidence] ?? 'text-slate-500'}`}>
          {operation.confidence}
        </span>
      </div>
      <h4 className="font-mono text-sm text-slate-200 mb-1">{operation.name}</h4>
      <div className="grid grid-cols-2 gap-1 mt-2">
        <div className="text-xs"><span className="text-slate-600 font-mono">ADVERSARY </span><span className="text-slate-400">{actor?.name ?? operation.adversaryId}</span></div>
        <div className="text-xs"><span className="text-slate-600 font-mono">CAPABILITY </span><span className="text-slate-400">{capability?.name ?? operation.capabilityId ?? '—'}</span></div>
        <div className="text-xs"><span className="text-slate-600 font-mono">VICTIM </span><span className="text-slate-400">{operation.victim?.sector}</span></div>
        <div className="text-xs"><span className="text-slate-600 font-mono">TIME </span><span className="text-slate-400">{operation.timeframe}</span></div>
      </div>
    </Link>
  )
}
