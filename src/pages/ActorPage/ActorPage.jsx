import { useParams } from 'react-router-dom'
import { useKnowledgeBase } from '../../hooks/useKnowledgeBase.js'
import DiamondDiagram from '../../components/DiamondDiagram/DiamondDiagram.jsx'
import OperationCard from '../../components/OperationCard/OperationCard.jsx'
import CapabilityBadge from '../../components/CapabilityBadge/CapabilityBadge.jsx'

const CONF_COLOR = { high: 'text-green-400', medium: 'text-yellow-400', low: 'text-red-400' }
const OP_TYPE_COLOR = { Cyber: 'bg-blue-900 text-blue-300', IO: 'bg-purple-900 text-purple-300' }

function OpTypeSplit({ operations }) {
  const total = operations.length
  if (total === 0) return null
  const counts = operations.reduce((acc, op) => {
    acc[op.opType] = (acc[op.opType] ?? 0) + 1; return acc
  }, {})
  return (
    <div className="mb-6">
      <p className="text-xs font-mono text-slate-500 mb-2">OPERATION TYPE SPLIT</p>
      <div className="flex h-3 rounded overflow-hidden gap-px">
        {Object.entries(counts).map(([type, count]) => (
          <div key={type} style={{ flex: count }} className={type === 'Cyber' ? 'bg-blue-700' : 'bg-purple-700'} />
        ))}
      </div>
      <div className="flex gap-4 mt-1">
        {Object.entries(counts).map(([type, count]) => (
          <span key={type} className="text-xs text-slate-500">{type} ({count})</span>
        ))}
      </div>
    </div>
  )
}

function CapabilityChart({ capabilities, operations }) {
  const freq = capabilities.map(cap => ({
    cap,
    count: operations.filter(o => o.capabilityId === cap.id).length
  })).sort((a, b) => b.count - a.count)
  const max = freq[0]?.count ?? 1
  return (
    <div className="mb-6">
      <p className="text-xs font-mono text-slate-500 mb-2">TOP CAPABILITIES</p>
      <div className="flex flex-col gap-2">
        {freq.map(({ cap, count }) => (
          <div key={cap.id} className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono w-28 flex-shrink-0">{cap.name}</span>
            <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
              <div className="h-full bg-blue-600 rounded" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="text-xs text-slate-600 w-4 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ActorPage() {
  const { id } = useParams()
  const { actorById, operationById, capabilityById, orgById, countryById } = useKnowledgeBase()

  const actor = actorById[id]
  if (!actor) return <div className="p-8 text-slate-500 font-mono">Actor not found: {id}</div>

  const operations = (actor.operationIds ?? []).map(oid => operationById[oid]).filter(Boolean)
  const capabilities = (actor.capabilityIds ?? []).map(cid => capabilityById[cid]).filter(Boolean)
  const org = orgById[actor.orgId]
  const country = countryById[actor.countryId]

  const sampleOp = operations[0]
  const sampleCap = capabilities[0]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-start gap-4 mb-2">
          <h1 className="text-2xl font-mono font-bold text-slate-100">{actor.name}</h1>
          <span className={`text-xs font-mono mt-1.5 ${CONF_COLOR[actor.confidence] ?? 'text-slate-500'}`}>
            {actor.confidence} confidence
          </span>
        </div>
        {actor.aliases?.length > 0 && (
          <p className="text-xs text-slate-500 font-mono mb-2">{actor.aliases.join(' · ')}</p>
        )}
        <p className="text-xs text-slate-500 font-mono mb-3">
          {country?.name} › {org?.name ?? actor.orgId}
        </p>
        <div className="flex gap-2 mb-3">
          {actor.opTypes?.map(t => (
            <span key={t} className={`text-xs px-2 py-0.5 rounded font-mono ${OP_TYPE_COLOR[t] ?? 'bg-slate-800 text-slate-400'}`}>{t}</span>
          ))}
        </div>
        <p className="text-sm text-slate-400 max-w-2xl">{actor.description}</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          {sampleOp && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4">
              <p className="text-xs font-mono text-slate-500 mb-3">SAMPLE OPERATION</p>
              <DiamondDiagram
                adversary={{ label: actor.name, id: actor.id }}
                capability={{ label: sampleCap?.name ?? '—', id: sampleCap?.id ?? '' }}
                infrastructure={{ label: (sampleOp.infrastructure?.description ?? '').slice(0, 20) || '—' }}
                victim={{ label: sampleOp.victim?.sector ?? '—' }}
              />
            </div>
          )}
        </div>

        <div className="col-span-2">
          <OpTypeSplit operations={operations} />
          {capabilities.length > 0 && <CapabilityChart capabilities={capabilities} operations={operations} />}
          {operations.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-mono text-slate-500 mb-2">VICTIM SECTORS</p>
              <div className="flex flex-wrap gap-2">
                {[...new Set(operations.map(o => o.victim?.sector).filter(Boolean))].map(sector => (
                  <span key={sector} className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-mono">{sector}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {operations.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-mono text-slate-400 mb-3">OPERATIONS ({operations.length})</h2>
          <div className="grid grid-cols-2 gap-4">
            {operations.map(op => (
              <OperationCard key={op.id} operation={op} actor={actor} capability={capabilityById[op.capabilityId]} />
            ))}
          </div>
        </div>
      )}

      {capabilities.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-mono text-slate-400 mb-3">CAPABILITIES ({capabilities.length})</h2>
          <div className="grid grid-cols-2 gap-4">
            {capabilities.map(cap => <CapabilityBadge key={cap.id} capability={cap} />)}
          </div>
        </div>
      )}
    </div>
  )
}
