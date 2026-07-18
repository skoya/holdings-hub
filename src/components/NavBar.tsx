import { NavLink } from 'react-router-dom';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1.5 text-sm transition-colors ${
    isActive ? 'bg-dark-2 text-white' : 'text-white/80 hover:bg-dark-2 hover:text-white'
  }`;

export function NavBar() {
  return (
    <header className="bg-dark text-white">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3"
      >
        <NavLink to="/" className="text-lg font-semibold tracking-tight">
          Meridian Bank <span className="font-normal text-white/70">— Client Holdings Hub</span>
        </NavLink>
        <div className="flex items-center gap-1">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/styleguide" className={linkClass}>
            Styleguide
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
