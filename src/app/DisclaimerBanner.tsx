/**
 * Persistent, non-dismissable simulation notice (PLAN Sections 1 and 5).
 * Present on every route including print views.
 */
export function DisclaimerBanner() {
  return (
    <div
      role="note"
      aria-label="Simulation notice"
      data-testid="disclaimer-banner"
      className="bg-banner px-4 py-2 text-center text-sm font-medium text-banner-ink print:block"
    >
      Simulation only — no real transactions or investment advice.
    </div>
  );
}
