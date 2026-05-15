import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'

function Breadcrumbs() {
  const location = useLocation()
  const parts = location.pathname.split('/').filter(Boolean)
  if (parts.length === 0) return null
  return (
    <nav className="flex items-center gap-2 text-xs font-mono text-slate-500 px-6 py-2 border-b border-slate-800">
      <Link to="/" className="hover:text-slate-300">HOME</Link>
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-2">
          <span>/</span>
          <span className="text-slate-400 uppercase">{decodeURIComponent(part)}</span>
        </span>
      ))}
    </nav>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  function handleSearch(e) {
    e.preventDefault()
    if (query.trim()) navigate(`/?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#080f1a]">
      <header className="border-b border-slate-800 px-6 py-3 flex items-center gap-6">
        <Link to="/" className="text-blue-400 font-bold font-mono text-sm tracking-widest">
          IW RESEARCH
        </Link>
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search actors, operations, aliases..."
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
        </form>
        <nav className="flex items-center gap-4 text-xs font-mono text-slate-500">
          <Link to="/research" className="hover:text-slate-300">RESEARCH</Link>
          <Link to="/analytics" className="hover:text-slate-300">ANALYTICS</Link>
        </nav>
      </header>
      <Breadcrumbs />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
