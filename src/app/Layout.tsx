import { Outlet } from 'react-router-dom';
import { NavBar } from '@/components/NavBar';
import { DisclaimerBanner } from './DisclaimerBanner';
import { DiagnosticsPanel } from './DiagnosticsPanel';

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-nav">
        Skip to main content
      </a>
      <NavBar />
      <DisclaimerBanner />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <DiagnosticsPanel />
      <footer className="border-t border-line bg-panel px-4 py-3 text-xs text-ink-soft">
        Meridian Bank is a fictional institution created for this simulation prototype. No real
        transactions, investment advice, or affiliation with any real bank.
      </footer>
    </div>
  );
}
