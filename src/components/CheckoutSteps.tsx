/**
 * PLAN → DETAILS → PAY progress indicator.
 *
 * Purely presentational. The checkout page is a single screen rather than
 * three, so this reassures people how far along they are instead of pretending
 * there are more pages than there are.
 */
export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1 as const, label: "Plan" },
    { n: 2 as const, label: "Details" },
    { n: 3 as const, label: "Pay" },
  ];

  return (
    <div className="steps">
      {steps.map((s, i) => {
        const state = s.n < current ? "done" : s.n === current ? "active" : "todo";
        return (
          <div key={s.n} className="contents">
            <div className="step" data-state={state}>
              <span className="step-dot">{state === "done" ? "✓" : s.n}</span>
              <span className="step-label">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <span
                className="step-line"
                data-state={s.n < current ? "done" : "todo"}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
