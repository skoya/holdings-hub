import { NavLink } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const baseLinks: NavItem[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/holdings', label: 'Holdings' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/audit', label: 'Audit' },
  { to: '/graph', label: 'Graph' },
  { to: '/library', label: 'Library' },
  { to: '/styleguide', label: 'Styleguide' },
];

// DeFi is hidden by default (PLAN Section 13) — the nav entry only appears when
// the active session has opted in.
const defiLink: NavItem = { to: '/defi', label: 'DeFi' };

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2.5 py-1.5 text-sm transition-colors ${
    isActive ? 'bg-dark-2 text-white' : 'text-white/80 hover:bg-dark-2 hover:text-white'
  }`;

export function NavBar() {
  const defiEnabled = useSessionStore((s) => s.session?.settings.defiEnabled ?? false);
  const links = defiEnabled
    ? [...baseLinks.slice(0, 6), defiLink, ...baseLinks.slice(6)]
    : baseLinks;
  return (
    <header className="bg-dark text-white">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3"
      >
        <NavLink to="/" className="text-lg font-semibold tracking-tight">
          Meridian Bank <span className="font-normal text-white/70">— Client Holdings Hub</span>
        </NavLink>
        <div className="flex flex-wrap items-center gap-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}
