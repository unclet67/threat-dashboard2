import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { useKnowledgeBase } from '../../hooks/useKnowledgeBase.js'
import DiamondDiagram from '../../components/DiamondDiagram/DiamondDiagram.jsx'

const CONF_COLOR = { high: 'text-green-400', medium: 'text-yellow-400', low: 'text-red-400' }
const OP_TYPE_COLOR = { Cyber: 'bg-blue-900 text-blue-300', IO: 'bg-purple-900 text-purple-300' }

function EditForm({ operation, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: operation.name,
    opType: operation.opType,
    killChainPhase: operation.killChainPhase ?? '',
    timeframe: operation.timeframe ?? '',
    confidence: operation.confidence,
    description: operation.description ?? '',
    victimSector: operation.victim?.sector ?? '',
    victimRegion: operation.victim?.region ?? '',
    victimDescription: operation.victim?.description ?? '',
    infraDescription: operation.infrastructure?.description ?? '',
    sources: (operation.sources ?? []).join('\n'),
  })

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      ...operation,
      name: form.name,
      opType: form.opType,
      killChainPhase: form.killChainPhase,
      timeframe: form.timeframe,
      confidence: form.confidence,
      description: form.description,
      victim: { ...operation.victim, sector: form.victimSector, region: form.victimRegion, description: form.victimDescription },
      infrastructure: { ...operation.infrastructure, description: form.infraDescription },
      sources: form.sources.split('\n').map(s => s.trim()).filter(Boolean),
    })
  }

  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
  const labelClass = "block text-xs font-mono text-slate-500 mb-1"

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 rounded-lg p-6 mt-4">
      <h3 className="text-sm font-mono text-slate-400 mb-4">EDIT OPERATION</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className={labelClass}>Name</label><input className={inputClass} value={form.name} onChange={set('name')} /></div>
        <div><label className={labelClass}>Op Type</label>
          <select className={inputClass} value={form.opType} onChange={set('opType')}>
            <option>Cyber</option><option>IO</option>
          </select>
        </div>
        <div><label className={labelClass}>Confidence</label>
          <select className={inputClass} value={form.confidence} onChange={set('confidence')}>
            <option>high</option><option>medium</option><option>low</option>
          </select>
        </div>
        <div><label className={labelClass}>Kill Chain Phase</label><input className={inputClass} value={form.killChainPhase} onChange={set('killChainPhase')} /></div>
        <div><label className={labelClass}>Timeframe</label><input className={inputClass} value={form.timeframe} onChange={set('timeframe')} /></div>
        <div><label className={labelClass}>Victim Sector</label><input className={inputClass} value={form.victimSector} onChange={set('victimSector')} /></div>
        <div><label className={labelClass}>Victim Region</label><input className={inputClass} value={form.victimRegion} onChange={set('victimRegion')} /></div>
        <div className="col-span-2"><label className={labelClass}>Victim Description</label><input className={inputClass} value={form.victimDescription} onChange={set('victimDescription')} /></div>
        <div className="col-span-2"><label className={labelClass}>Infrastructure Description</label><input className={inputClass} value={form.infraDescription} onChange={set('infraDescription')} /></div>
        <div className="col-span-2"><label className={labelClass}>Description</label><textarea className={inputClass + " h-20 resize-none"} value={form.description} onChange={set('description')} /></div>
        <div className="col-span-2"><label className={labelClass}>Sources (one per line)</label><textarea className={inputClass + " h-16 resize-none"} value={form.sources} onChange={set('sources')} /></div>
      </div>
      <div className="flex gap-3 mt-4">
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-sm px-4 py-2 rounded">Save</button>
        <button type="button" onClick={onCancel} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-sm px-4 py-2 rounded">Cancel</button>
      </div>
    </form>
  )
}

export default function OperationPage() {
  const { id } = useParams()
  const { operationById, actorById, capabilityById, writeKbEntry } = useKnowledgeBase()
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  const operation = operationById[id]
  if (!operation) return <div className="p-8 text-slate-500 font-mono">Operation not found: {id}</div>

  const actor = actorById[operation.adversaryId]
  const capability = capabilityById[operation.capabilityId]

  async function handleSave(updated) {
    await writeKbEntry(`operations/${updated.id}.json`, updated)
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded font-mono ${OP_TYPE_COLOR[operation.opType] ?? 'bg-slate-800 text-slate-400'}`}>{operation.opType}</span>
            <span className={`text-xs font-mono ${CONF_COLOR[operation.confidence] ?? 'text-slate-500'}`}>{operation.confidence} confidence</span>
            {saved && <span className="text-xs text-green-400 font-mono">✓ Saved</span>}
          </div>
          <h1 className="text-xl font-mono font-bold text-slate-100">{operation.name}</h1>
          <p className="text-xs text-slate-500 font-mono mt-1">{operation.timeframe} · {operation.killChainPhase}</p>
        </div>
        <button
          onClick={() => setEditing(e => !e)}
          className="text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 py-1.5 rounded"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="flex justify-center my-6">
        <DiamondDiagram
          adversary={{ label: actor?.name ?? operation.adversaryId, id: operation.adversaryId }}
          capability={{ label: capability?.name ?? operation.capabilityId ?? '—', id: operation.capabilityId }}
          infrastructure={{ label: (operation.infrastructure?.description ?? '').slice(0, 20) || '—' }}
          victim={{ label: operation.victim?.sector ?? '—' }}
          interactive
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <p className="text-xs font-mono text-slate-500 mb-1">ADVERSARY</p>
          <p className="text-sm text-slate-300">{actor?.name ?? operation.adversaryId}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <p className="text-xs font-mono text-slate-500 mb-1">CAPABILITY</p>
          <p className="text-sm text-slate-300">{capability?.name ?? operation.capabilityId ?? '—'}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <p className="text-xs font-mono text-slate-500 mb-1">INFRASTRUCTURE</p>
          <p className="text-sm text-slate-300">{operation.infrastructure?.description ?? '—'}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <p className="text-xs font-mono text-slate-500 mb-1">VICTIM</p>
          <p className="text-sm text-slate-300">{operation.victim?.sector} · {operation.victim?.region}</p>
          <p className="text-xs text-slate-500 mt-1">{operation.victim?.description}</p>
        </div>
      </div>

      {operation.description && (
        <p className="text-sm text-slate-400 mb-4">{operation.description}</p>
      )}

      {operation.sources?.length > 0 && (
        <div>
          <p className="text-xs font-mono text-slate-500 mb-2">SOURCES</p>
          <ul className="flex flex-col gap-1">
            {operation.sources.map((src, i) => (
              <li key={i}>
                <a href={src} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 break-all">{src}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <EditForm operation={operation} onSave={handleSave} onCancel={() => setEditing(false)} />
      )}
    </div>
  )
}
