import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Comparisons', end: true },
  { to: '/cars', label: 'Cars', end: false },
  { to: '/settings', label: 'Import / Export', end: false },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — hidden on mobile in favor of the bottom tab bar. */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block">
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

      {/* Extra bottom padding on mobile so content clears the fixed tab bar. */}
      <main className="flex-1 overflow-x-auto">
        <div className="mx-auto max-w-[1400px] px-4 pb-20 pt-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'flex flex-1 items-center justify-center px-2 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'text-slate-900'
                  : 'text-slate-500 hover:text-slate-700',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <span
                className={[
                  'rounded-md px-3 py-1.5',
                  isActive ? 'bg-slate-900 text-white' : '',
                ].join(' ')}
              >
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
