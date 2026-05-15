import { useState, useRef, useEffect } from 'react'
import { useKnowledgeBase } from '../../hooks/useKnowledgeBase.js'
import { useClaudeResearch } from '../../hooks/useClaudeResearch.js'

const COUNTRY_CHIPS = ['China', 'Russia', 'Iran', 'North Korea']

function Message({ msg }) {
  const isUser = msg.role === 'user'
  const text = typeof msg.content === 'string' ? msg.content : msg.content?.[0]?.text ?? ''
  const displayText = text.replace(/<KB_ENTITY>[\s\S]*?<\/KB_ENTITY>/g, '').trim()

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs flex-shrink-0 mt-1">⚗</div>
      )}
      <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser ? 'bg-blue-900 text-blue-100 rounded-br-sm' : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-bl-sm'
      }`}>
        {displayText}
      </div>
    </div>
  )
}

function SaveEntityModal({ entity, onSave, onDismiss }) {
  const [form, setForm] = useState(entity.data)
  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
  const labelClass = "block text-xs font-mono text-slate-500 mb-1"

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <h3 className="font-mono text-sm text-slate-300 mb-4">SAVE TO KNOWLEDGE BASE — {entity.type.toUpperCase()}</h3>
        <div className="flex flex-col gap-3">
          {Object.entries(form).map(([key, val]) => (
            typeof val === 'string' || typeof val === 'number' ? (
              <div key={key}>
                <label className={labelClass}>{key.toUpperCase()}</label>
                <input
                  className={inputClass}
                  value={String(val)}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ) : null
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => onSave({ ...entity, data: form })} className="bg-green-700 hover:bg-green-600 text-white font-mono text-sm px-4 py-2 rounded">
            Confirm Save
          </button>
          <button onClick={onDismiss} className="bg-slate-800 hover:bg-slate-700 text-slate-400 font-mono text-sm px-4 py-2 rounded">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ResearchPage() {
  const kb = useKnowledgeBase()
  const { messages, loading, error, sendMessage, clearHistory, extractKbEntity } = useClaudeResearch(kb)
  const [input, setInput] = useState('')
  const [chips, setChips] = useState([])
  const [pendingEntity, setPendingEntity] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function toggleChip(chip) {
    setChips(c => c.includes(chip) ? c.filter(x => x !== chip) : [...c, chip])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const text = input
    setInput('')
    const responseText = await sendMessage(text, chips)
    if (responseText) {
      const entity = extractKbEntity(responseText)
      if (entity) setPendingEntity(entity)
    }
  }

  async function handleSaveEntity(entity) {
    const path = `${entity.type}s/${entity.data.id ?? `${entity.type}-${Date.now()}`}.json`
    try {
      await kb.writeKbEntry(path, entity.data)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch {
      setSaveStatus('error')
    }
    setPendingEntity(null)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-mono font-bold text-slate-100">AI Research</h1>
        <div className="flex items-center gap-3">
          {saveStatus === 'saved' && <span className="text-xs text-green-400 font-mono">✓ Saved to KB</span>}
          {saveStatus === 'error' && <span className="text-xs text-red-400 font-mono">Save failed</span>}
          <button onClick={clearHistory} className="text-xs font-mono text-slate-600 hover:text-slate-400">
            Clear History
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-mono text-slate-600">Context:</span>
        {COUNTRY_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => toggleChip(chip)}
            className={`text-xs font-mono px-3 py-1 rounded-full transition-colors ${
              chips.includes(chip)
                ? 'bg-blue-700 text-blue-200'
                : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="text-center text-slate-600 font-mono text-sm mt-12">
            <p className="mb-2">Ask about IW activity, threat actors, or operations.</p>
            <p className="text-xs">Try: "Research recent Salt Typhoon activity" or "What IO operations has Russia conducted in 2024?"</p>
          </div>
        )}
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs flex-shrink-0">⚗</div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
              <span className="text-slate-500 text-sm animate-pulse font-mono">Researching...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300 font-mono">
            Error: {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about IW activity, actors, or operations..."
          disabled={loading}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-mono text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          Send
        </button>
      </form>

      {pendingEntity && (
        <SaveEntityModal
          entity={pendingEntity}
          onSave={handleSaveEntity}
          onDismiss={() => setPendingEntity(null)}
        />
      )}
    </div>
  )
}
