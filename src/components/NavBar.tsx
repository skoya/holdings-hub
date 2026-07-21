import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/stores/sessionStore';
import { LanguageSwitcher } from './LanguageSwitcher';

interface NavItem {
  to: string;
  labelKey: string;
  end?: boolean;
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

const topLevelLinks: NavItem[] = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/holdings', labelKey: 'nav.holdings' },
  { to: '/personas', labelKey: 'nav.personas' },
  { to: '/transactions', labelKey: 'nav.transactions' },
];

const analyticsGroup: NavGroup = {
  labelKey: 'nav.group.analytics',
  items: [
    { to: '/timeline', labelKey: 'nav.timeline' },
    { to: '/audit', labelKey: 'nav.audit' },
    { to: '/graph', labelKey: 'nav.graph' },
  ],
};

const defiItem: NavItem = { to: '/defi', labelKey: 'nav.defi' };

const toolsGroup: NavGroup = {
  labelKey: 'nav.group.tools',
  items: [
    { to: '/library', labelKey: 'nav.library' },
    { to: '/mobile', labelKey: 'nav.mobile' },
    { to: '/styleguide', labelKey: 'nav.styleguide' },
  ],
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2.5 py-1.5 text-sm transition-colors ${
    isActive ? 'bg-dark-2 text-white' : 'text-white/80 hover:bg-dark-2 hover:text-white'
  }`;

const chevronDown = (
  <svg
    className="ml-1 inline-block h-3 w-3 opacity-70"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    viewBox="0 0 12 12"
    aria-hidden
  >
    <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function NavDropdown({ group }: { group: NavGroup }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isGroupActive = group.items.some((item) => location.pathname.startsWith(item.to));

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`rounded px-2.5 py-1.5 text-sm transition-colors ${
          isGroupActive
            ? 'bg-dark-2 text-white'
            : 'text-white/80 hover:bg-dark-2 hover:text-white'
        }`}
      >
        {t(group.labelKey)}
        {chevronDown}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-md border border-white/10 bg-dark shadow-lg">
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-dark-2 text-white'
                    : 'text-white/80 hover:bg-dark-2 hover:text-white'
                }`
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function NavBar() {
  const { t } = useTranslation();
  const defiEnabled = useSessionStore((s) => s.session?.settings.defiEnabled ?? false);

  const analyticsGroupWithDefi: NavGroup = defiEnabled
    ? { ...analyticsGroup, items: [...analyticsGroup.items, defiItem] }
    : analyticsGroup;

  return (
    <header className="bg-dark text-white">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3"
      >
        <NavLink to="/" className="text-lg font-semibold tracking-tight">
          {t('app.title')} <span className="font-normal text-white/70">— {t('app.subtitle')}</span>
        </NavLink>
        <div className="flex flex-wrap items-center gap-1">
          {topLevelLinks.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {t(l.labelKey)}
            </NavLink>
          ))}
          <NavDropdown group={analyticsGroupWithDefi} />
          <NavDropdown group={toolsGroup} />
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}
