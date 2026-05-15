import { Link } from 'react-router-dom'

const NODE_CONFIG = {
  adversary: { cx: 140, cy: 28, color: '#3b82f6', role: 'ADVERSARY' },
  capability: { cx: 252, cy: 120, color: '#8b5cf6', role: 'CAPABILITY' },
  victim: { cx: 140, cy: 212, color: '#ef4444', role: 'VICTIM' },
  infrastructure: { cx: 28, cy: 120, color: '#f59e0b', role: 'INFRASTRUCTURE' },
}

function Node({ config, label, id, interactive }) {
  const { cx, cy, color, role } = config
  const content = (
    <g>
      <circle cx={cx} cy={cy} r={28} fill="#0f172a" stroke={color} strokeWidth={2} />
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#64748b" fontSize={7} fontFamily="monospace">
        {role}
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle" fill="#e2e8f0" fontSize={10} fontWeight="bold" fontFamily="monospace">
        {label.length > 12 ? label.slice(0, 11) + '…' : label}
      </text>
    </g>
  )
  if (interactive && id) {
    const href = role === 'ADVERSARY' ? `/actor/${id}` : `/operation/${id}`
    return <Link to={href}>{content}</Link>
  }
  return content
}

export default function DiamondDiagram({ adversary, capability, infrastructure, victim, interactive = false }) {
  return (
    <svg viewBox="0 0 280 240" width="100%" style={{ maxWidth: 320 }} aria-label="Diamond Model diagram">
      <line x1={140} y1={28} x2={140} y2={212} stroke="#1e293b" strokeWidth={1} strokeDasharray="4,3" />
      <line x1={28} y1={120} x2={252} y2={120} stroke="#1e293b" strokeWidth={1} strokeDasharray="4,3" />
      <text x={140} y={232} textAnchor="middle" fill="#334155" fontSize={7} fontFamily="monospace">SOCIAL-POLITICAL</text>
      <text x={10} y={120} textAnchor="middle" fill="#334155" fontSize={7} fontFamily="monospace" transform="rotate(-90,10,120)">TECHNOLOGY</text>
      <polygon points="140,28 252,120 140,212 28,120" fill="#1e3a5f" fillOpacity={0.1} stroke="#1e40af" strokeWidth={1.5} strokeOpacity={0.6} />
      <line x1={140} y1={56} x2={224} y2={100} stroke="#3b82f6" strokeWidth={1} opacity={0.3} />
      <line x1={224} y1={140} x2={140} y2={184} stroke="#3b82f6" strokeWidth={1} opacity={0.3} />
      <line x1={56} y1={100} x2={140} y2={56} stroke="#3b82f6" strokeWidth={1} opacity={0.3} />
      <line x1={56} y1={140} x2={140} y2={184} stroke="#3b82f6" strokeWidth={1} opacity={0.3} />
      <Node config={NODE_CONFIG.adversary} label={adversary.label} id={adversary.id} interactive={interactive} />
      <Node config={NODE_CONFIG.capability} label={capability.label} id={capability.id} interactive={interactive} />
      <Node config={NODE_CONFIG.victim} label={victim.label} interactive={false} />
      <Node config={NODE_CONFIG.infrastructure} label={infrastructure.label} interactive={false} />
    </svg>
  )
}
