import "./PageIndicator.css";

/**
 * PageIndicator — current page title + dot indicator, replacing the old
 * top tab row. Sits below the header, always visible (unlike the swipe
 * arrows, which auto-hide) so the operator always knows which of the 3
 * pages they're on.
 *
 * @param {Array}  pages     [{ id, label }]
 * @param {string} activeId
 */
export default function PageIndicator({ pages, activeId }) {
  const activeIdx = pages.findIndex((p) => p.id === activeId);

  return (
    <div className="pgind" role="tablist" aria-label="Dashboard pages">
      <div className="pgind__title">{pages[activeIdx]?.label}</div>
      <div className="pgind__dots">
        {pages.map((p, i) => (
          <span
            key={p.id}
            className={`pgind__dot ${i === activeIdx ? "is-active" : ""}`}
            role="tab"
            aria-selected={i === activeIdx}
            aria-label={p.label}
          />
        ))}
      </div>
    </div>
  );
}
