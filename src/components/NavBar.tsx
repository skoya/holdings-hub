import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/stores/sessionStore';
import { LanguageSwitcher } from './LanguageSwitcher';

interface NavItem {
  to: string;
  labelKey: string;
  end?: boolean;
}

const baseLinks: NavItem[] = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/holdings', labelKey: 'nav.holdings' },
  { to: '/personas', labelKey: 'nav.personas' },
  { to: '/transactions', labelKey: 'nav.transactions' },
  { to: '/timeline', labelKey: 'nav.timeline' },
  { to: '/audit', labelKey: 'nav.audit' },
  { to: '/graph', labelKey: 'nav.graph' },
  { to: '/library', labelKey: 'nav.library' },
  { to: '/mobile', labelKey: 'nav.mobile' },
  { to: '/styleguide', labelKey: 'nav.styleguide' },
];

// DeFi is hidden by default (PLAN Section 13) — the nav entry only appears when
// the active session has opted in.
const defiLink: NavItem = { to: '/defi', labelKey: 'nav.defi' };

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2.5 py-1.5 text-sm transition-colors ${
    isActive ? 'bg-dark-2 text-white' : 'text-white/80 hover:bg-dark-2 hover:text-white'
  }`;

export function NavBar() {
  const { t } = useTranslation();
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
          {t('app.title')} <span className="font-normal text-white/70">— {t('app.subtitle')}</span>
        </NavLink>
        <div className="flex flex-wrap items-center gap-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {t(l.labelKey)}
            </NavLink>
          ))}
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}
