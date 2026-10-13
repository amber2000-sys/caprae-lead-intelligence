import { useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface NavItem {
  to: string;
  label: string;
  icon: JSX.Element;
  end?: boolean;
}

const icon = (path: JSX.Element) => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

/**
 * Navigation is grouped by the workflow it supports, not alphabetically. The
 * order matches the order a searcher actually works in: set criteria, find
 * companies, review them, keep the good ones.
 */
const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', end: true, icon: icon(<><rect x="2.5" y="2.5" width="6" height="6" rx="1" /><rect x="11.5" y="2.5" width="6" height="6" rx="1" /><rect x="2.5" y="11.5" width="6" height="6" rx="1" /><rect x="11.5" y="11.5" width="6" height="6" rx="1" /></>) },
      { to: '/analytics', label: 'Analytics', icon: icon(<><path d="M3 17V9" /><path d="M8 17V4" /><path d="M13 17v-6" /><path d="M17.5 17V7" /></>) },
    ],
  },
  {
    label: 'Sourcing',
    items: [
      { to: '/buy-box', label: 'Buy Box', icon: icon(<><path d="M2.5 6.5 10 2.5l7.5 4v7L10 17.5l-7.5-4z" /><path d="M2.5 6.5 10 10.5l7.5-4" /><path d="M10 10.5v7" /></>) },
      { to: '/discovery', label: 'Lead Discovery', icon: icon(<><circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 4 4" /></>) },
      { to: '/leads', label: 'Lead Results', icon: icon(<><rect x="2.5" y="3.5" width="15" height="13" rx="1.5" /><path d="M2.5 7.5h15M7.5 7.5v9" /></>) },
    ],
  },
  {
    label: 'Pipeline',
    items: [
      { to: '/saved', label: 'Saved Leads', icon: icon(<path d="M5 2.5h10a1 1 0 0 1 1 1v14l-6-4-6 4v-14a1 1 0 0 1 1-1z" />) },
      { to: '/about', label: 'About & Method', icon: icon(<><circle cx="10" cy="10" r="7.5" /><path d="M10 9v4.5M10 6.5v.01" /></>) },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label="Main navigation">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-2.5 mb-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-500">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-3 h-10 rounded-lg text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-data-300 text-ink-950 font-semibold before:absolute before:-left-3 before:w-0.5 before:h-5 before:rounded-r before:bg-data-300'
                        : 'text-ink-400 hover:text-white hover:bg-data-300/10'
                    }`
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar — dark so the working surface beside it stays the brightest
          thing on screen and the eye lands on the data, not the chrome. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 shrink-0 bg-ink-950 flex flex-col overflow-hidden
                    transition-transform duration-200 lg:translate-x-0
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundImage: 'linear-gradient(180deg, #1a1a1a, #0a0a0a)' }}
      >
        <div className="px-5 h-[4.5rem] flex items-center border-b border-data-300/15">
          <Link to="/" className="flex items-center gap-2.5 min-w-0" onClick={() => setMobileOpen(false)}>
            <img src="/caprae-logo.png" alt="" className="w-10 h-10 object-contain shrink-0" />
            <span className="min-w-0">
              <span className="block text-base font-semibold tracking-wide text-white leading-tight truncate">CAPRAE</span>
              <span className="block text-[0.55rem] uppercase tracking-[0.22em] text-ink-400 leading-tight truncate">Lead Intelligence</span>
            </span>
          </Link>
        </div>

        {/*
         * The sidebar is navigation only.
         *
         * It previously also pinned an "Active Buy Box" summary and a
         * "Demo dataset" footer. Both were removed as duplication rather than
         * as information: the Dashboard states the full criteria in its own
         * strip and the Buy Box editor is one click away in the nav above,
         * while the synthetic-data disclosure already appears on Lead Results,
         * Analytics, Discovery, About, and as a badge on every lead detail.
         */}
        <NavLinks onNavigate={() => setMobileOpen(false)} />
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink-950/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col lg:ml-60">
        <header className="lg:hidden sticky top-0 z-20 h-14 px-4 flex items-center gap-3 bg-ink-950 border-b border-ink-800">
          <button
            type="button"
            className="btn-ghost h-8 w-8 p-0"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 5.5h14M3 10h14M3 14.5h14" />
            </svg>
          </button>
          <img src="/caprae-logo.png" alt="" className="w-8 h-8 object-contain shrink-0" />
          <span className="text-sm font-semibold text-ink-900">Caprae Lead Intelligence</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:px-8 lg:py-7 xl:px-10 2xl:px-11 max-w-[100rem] w-full mx-auto">
          {/* Keyed on pathname so navigating away from a crashed page clears it. */}
          <ErrorBoundary key={pathname} label="This page">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
