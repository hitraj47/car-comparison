import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Comparisons', end: true },
  { to: '/cars', label: 'Cars', end: false },
  { to: '/settings', label: 'Import / Export', end: false },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen min-w-[1200px]">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h1 className="text-lg font-semibold text-slate-900">
            Car Comparison
          </h1>
          <p className="text-xs text-slate-500">Local · offline</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-x-auto">
        <div className="mx-auto max-w-[1400px] px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
