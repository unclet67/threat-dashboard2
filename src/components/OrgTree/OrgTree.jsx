import { useState } from 'react'
import { Link } from 'react-router-dom'

function OrgNode({ org, allOrgs, actors, depth = 0 }) {
  const [open, setOpen] = useState(true)
  const children = allOrgs.filter(o => o.parentOrgId === org.id)
  const orgActors = actors.filter(a => a.orgId === org.id)
  const hasChildren = children.length > 0 || orgActors.length > 0

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <button
        onClick={() => hasChildren && setOpen(o => !o)}
        className="flex items-center gap-1 py-1 text-sm text-slate-400 hover:text-slate-200 font-mono w-full text-left"
      >
        <span className="text-xs w-3">{hasChildren ? (open ? '▾' : '▸') : ' '}</span>
        {org.name}
      </button>
      {open && (
        <div>
          {orgActors.map(actor => (
            <Link
              key={actor.id}
              to={`/actor/${actor.id}`}
              className="flex items-center gap-1 py-0.5 text-xs text-blue-400 hover:text-blue-300 font-mono"
              style={{ paddingLeft: (depth + 1) * 16 + 4 }}
            >
              <span className="text-slate-600">•</span> {actor.name}
            </Link>
          ))}
          {children.map(child => (
            <OrgNode key={child.id} org={child} allOrgs={allOrgs} actors={actors} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function OrgTree({ orgs, actors, countryId }) {
  const roots = orgs.filter(o => o.countryId === countryId && !o.parentOrgId)
  return (
    <div className="py-2">
      {roots.map(org => (
        <OrgNode key={org.id} org={org} allOrgs={orgs} actors={actors} />
      ))}
    </div>
  )
}
