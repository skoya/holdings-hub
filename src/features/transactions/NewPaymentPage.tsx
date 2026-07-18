import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SessionGuard } from '@/features/common/SessionGuard';
import { useSessionStore } from '@/stores/sessionStore';
import { JurisdictionSchema, type Jurisdiction } from '@/schemas';

function NewPaymentView() {
  const navigate = useNavigate();
  const createPayment = useSessionStore((s) => s.createPayment);
  const [amount, setAmount] = useState(250_000);
  const [beneficiaryName, setBeneficiaryName] = useState('Helvetia Estates AG');
  const [institution, setInstitution] = useState('External Bank Zurich (fictional)');
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('CH');
  const [rationale, setRationale] = useState('Property completion payment (simulated)');

  const labelCls = 'block text-sm font-medium mb-1';
  const inputCls = 'w-full rounded border border-line bg-panel px-3 py-2 text-sm';

  const submit = () => {
    const txId = createPayment({
      amount,
      currency: 'GBP',
      beneficiaryName,
      beneficiaryInstitution: institution,
      beneficiaryJurisdiction: jurisdiction,
      rationale,
    });
    navigate(`/transactions/${txId}`);
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">New cross-border payment</h1>
      <Card>
        <p className="mb-3 text-sm text-ink-soft">
          GBP funding account → beneficiary in another jurisdiction. Route options (SWIFT vs
          stablecoin rail) are generated on creation.
        </p>
        <label className={labelCls} htmlFor="amount">
          Amount (GBP)
        </label>
        <input
          id="amount"
          type="number"
          min={1}
          className={inputCls}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <label className={`${labelCls} mt-3`} htmlFor="beneficiary">
          Beneficiary name
        </label>
        <input
          id="beneficiary"
          className={inputCls}
          value={beneficiaryName}
          onChange={(e) => setBeneficiaryName(e.target.value)}
        />
        <label className={`${labelCls} mt-3`} htmlFor="institution">
          Beneficiary institution
        </label>
        <input
          id="institution"
          className={inputCls}
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
        />
        <label className={`${labelCls} mt-3`} htmlFor="jurisdiction">
          Beneficiary jurisdiction
        </label>
        <select
          id="jurisdiction"
          className={inputCls}
          value={jurisdiction}
          onChange={(e) => setJurisdiction(JurisdictionSchema.parse(e.target.value))}
        >
          {JurisdictionSchema.options.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
        <label className={`${labelCls} mt-3`} htmlFor="rationale">
          Rationale (recorded in audit trail)
        </label>
        <input
          id="rationale"
          className={inputCls}
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={submit} disabled={amount <= 0} data-testid="create-payment">
            Create draft
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function NewPaymentPage() {
  return (
    <SessionGuard>
      <NewPaymentView />
    </SessionGuard>
  );
}
