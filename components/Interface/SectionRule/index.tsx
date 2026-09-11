/**
 * Section rule.
 *
 * Carries a section's rank rather than decorating it: the label sits on a
 * hairline running to the edge of the column, so scanning a page reads as a
 * contents list. Shared across the internal pages so they share one rhythm.
 */
const SectionRule = ({ label, note }: { label: string; note?: string }) => (
  <div className="flex items-baseline gap-4 mb-4">
    <h2 className="text-sm text-[var(--ink-signal)] shrink-0">{label}</h2>
    <span className="h-px flex-1 bg-[var(--line)]" aria-hidden />
    {note && <span className="text-xs text-[var(--ink-muted)] shrink-0">{note}</span>}
  </div>
);

export default SectionRule;
