import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { HomePage } from '@/features/home/HomePage';
import { StyleguidePage } from '@/features/styleguide/StyleguidePage';
import { WizardPage } from '@/features/wizard/WizardPage';
import { HoldingsPage } from '@/features/holdings/HoldingsPage';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';
import { NewPaymentPage } from '@/features/transactions/NewPaymentPage';
import { NewUsdcPage } from '@/features/transactions/NewUsdcPage';
import { TransactionDetailPage } from '@/features/transactions/TransactionDetailPage';
import { TimelinePage } from '@/features/timeline/TimelinePage';
import { AuditPage } from '@/features/audit/AuditPage';
import { DefiPage } from '@/features/defi/DefiPage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { SessionDeepLink } from '@/features/library/SessionDeepLink';
import { MobilePage } from '@/features/mobile/MobilePage';

// Code-split the D3-heavy entity graph off the initial bundle (PLAN Section 31).
const GraphPage = lazy(() =>
  import('@/features/graph/GraphPage').then((m) => ({ default: m.GraphPage })),
);

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="wizard" element={<Navigate to="/wizard/step/1" replace />} />
        <Route path="wizard/step/:step" element={<WizardPage />} />
        <Route path="holdings" element={<HoldingsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="transactions/new/payment" element={<NewPaymentPage />} />
        <Route path="transactions/new/usdc" element={<NewUsdcPage />} />
        <Route path="transactions/:txId" element={<TransactionDetailPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route
          path="graph"
          element={
            <Suspense
              fallback={<div className="p-8 text-sm text-ink-soft">Loading entity graph…</div>}
            >
              <GraphPage />
            </Suspense>
          }
        />
        <Route path="defi" element={<DefiPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="mobile" element={<MobilePage />} />
        <Route path="open/:id" element={<SessionDeepLink />} />
        <Route path="styleguide" element={<StyleguidePage />} />
        <Route
          path="*"
          element={
            <div className="p-8">
              <h1 className="text-xl font-semibold">Page not found</h1>
              <p className="mt-2 text-ink-soft">This route does not exist in the simulation.</p>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
