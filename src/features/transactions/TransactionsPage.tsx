import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SessionGuard } from '@/features/common/SessionGuard';
import { useSessionStore } from '@/stores/sessionStore';
import type { TransactionState } from '@/schemas';

export function stateTone(state: TransactionState): 'neutral' | 'accent' | 'success' | 'warning' {
  if (state === 'settled') return 'success';
  if (state === 'failed' || state === 'returned') return 'accent';
  if (state === 'pending-approval') return 'warning';
  return 'neutral';
}

function TransactionsView() {
  const session = useSessionStore((s) => s.session)!;
  const createDsvpDemo = useSessionStore((s) => s.createDsvpDemo);
  const navigate = useNavigate();
  const dsvpAvailable =
    session.holdings.some((h) => h.assetRef === 'asset-tokenised-bond') &&
    session.holdings.some((h) => h.assetRef === 'asset-tokenised-deposit');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Transactions</h1>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/transactions/new/payment" className="text-accent underline">
            New cross-border payment
          </Link>
          <Link to="/transactions/new/usdc" className="text-accent underline">
            New USDC transfer
          </Link>
          {dsvpAvailable && (
            <button
              type="button"
              className="text-accent underline"
              data-testid="new-dsvp"
              onClick={() => {
                const txId = createDsvpDemo();
                navigate(`/transactions/${txId}`);
              }}
            >
              New DvP settlement (demo)
            </button>
          )}
        </div>
      </div>
      <Card>
        {session.transactions.length === 0 ? (
          <p className="text-sm text-ink-soft">
            No transactions yet. Initiate a cross-border payment or a USDC transfer.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink-soft">
                <th className="py-2 pr-4">Reference</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2 pr-4">Beneficiary</th>
                <th className="py-2 pr-4">State</th>
                <th className="py-2">Updated (UTC)</th>
              </tr>
            </thead>
            <tbody data-testid="transactions-table">
              {session.transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-line/60">
                  <td className="py-2 pr-4">
                    <Link to={`/transactions/${tx.id}`} className="text-accent underline">
                      {tx.reference}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{tx.type}</td>
                  <td className="py-2 pr-4 text-right">
                    {new Intl.NumberFormat('en-GB').format(tx.amount)} {tx.currency}
                  </td>
                  <td className="py-2 pr-4">{tx.beneficiary.name}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={stateTone(tx.state)}>{tx.state}</Badge>
                  </td>
                  <td className="py-2">{tx.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export function TransactionsPage() {
  return (
    <SessionGuard>
      <TransactionsView />
    </SessionGuard>
  );
}
