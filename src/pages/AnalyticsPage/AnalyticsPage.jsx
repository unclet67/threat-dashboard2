import { useKnowledgeBase } from '../../hooks/useKnowledgeBase.js'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const COUNTRY_NAMES = { china: 'China', russia: 'Russia', iran: 'Iran', 'north-korea': 'DPRK' }
const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e', '#06b6d4']

export default function AnalyticsPage() {
  const { countries, actors, operations, capabilities } = useKnowledgeBase()

  const opsByCountry = countries.map(c => {
    const countryActorIds = new Set(actors.filter(a => a.countryId === c.id).map(a => a.id))
    const countryOps = operations.filter(o => countryActorIds.has(o.adversaryId))
    return {
      country: COUNTRY_NAMES[c.id] ?? c.name,
      Cyber: countryOps.filter(o => o.opType === 'Cyber').length,
      IO: countryOps.filter(o => o.opType === 'IO').length,
    }
  })

  const capFreq = capabilities.map(cap => ({
    name: cap.name,
    operations: operations.filter(o => o.capabilityId === cap.id).length,
  })).filter(c => c.operations > 0).sort((a, b) => b.operations - a.operations)

  const sectorCounts = operations.reduce((acc, op) => {
    const s = op.victim?.sector
    if (s) acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})
  const sectorData = Object.entries(sectorCounts).map(([name, value]) => ({ name, value }))

  const timelineCounts = operations.reduce((acc, op) => {
    const t = op.timeframe ?? 'Unknown'
    acc[t] = (acc[t] ?? 0) + 1
    return acc
  }, {})
  const timelineData = Object.entries(timelineCounts)
    .map(([period, count]) => ({ period, count }))
    .sort((a, b) => a.period.localeCompare(b.period))

  const chartTooltipStyle = {
    backgroundColor: '#0f172a', border: '1px solid #1e293b',
    borderRadius: 4, color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-mono font-bold text-slate-100 mb-8">Analytics</h1>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="text-xs font-mono text-slate-500 mb-4">OPERATIONS BY COUNTRY</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={opsByCountry}>
              <XAxis dataKey="country" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }} />
              <Bar dataKey="Cyber" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="IO" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="text-xs font-mono text-slate-500 mb-4">VICTIM SECTORS</h2>
          {sectorData.length === 0 ? (
            <p className="text-slate-600 text-sm font-mono">No sector data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sectorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                  {sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {capFreq.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h2 className="text-xs font-mono text-slate-500 mb-4">TOP CAPABILITIES</h2>
            <div className="flex flex-col gap-2">
              {capFreq.slice(0, 6).map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-mono w-28 flex-shrink-0">{c.name}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${(c.operations / capFreq[0].operations) * 100}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                  <span className="text-xs text-slate-600 w-4 text-right">{c.operations}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {timelineData.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h2 className="text-xs font-mono text-slate-500 mb-4">OPERATION TIMELINE</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timelineData}>
                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
