import { getTechniqueUrl } from '../../utils/mitre.js'

export default function CapabilityBadge({ capability }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-sm text-slate-200">{capability.name}</span>
        <span className="text-xs text-slate-500 font-mono bg-slate-800 px-2 py-0.5 rounded">{capability.type}</span>
      </div>
      <p className="text-xs text-slate-500 mb-2">{capability.description}</p>
      {capability.mitreAttackIds?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {capability.mitreAttackIds.map(id => (
            <a
              key={id}
              href={getTechniqueUrl(id)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-blue-400 hover:text-blue-300 bg-slate-800 px-2 py-0.5 rounded"
            >
              {id}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
