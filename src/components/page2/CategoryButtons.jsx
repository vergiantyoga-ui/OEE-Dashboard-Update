import { Card, Badge } from "../ui";
import "./CategoryButtons.css";

/**
 * CategoryButtons (PRD Bab 8.2/8.3, restructured per user request) —
 * quick-access summary for the 4 classification categories: Downtime,
 * Major Stop, Speed Loss, Reject/Scrap. Clicking a button opens that
 * category's overview as a popup instead of showing it inline.
 *
 * @param {Array} categories  [{ key, label, icon, tone, uncommented, total }]
 * @param {Function} onOpen   (key) => void
 */
export default function CategoryButtons({ categories, onOpen }) {
  return (
    <Card title="Reason Classification" muted>
      <div className="catbtn__grid">
        {categories.map((c) => (
          <button
            key={c.key}
            className="catbtn"
            onClick={() => onOpen(c.key)}
            aria-label={`${c.label}, ${c.total} events, ${c.uncommented} action required`}
          >
            <span className={`catbtn__icon catbtn__icon--${c.tone}`} aria-hidden="true">
              {c.glyph}
            </span>
            <span className="catbtn__body">
              <span className="catbtn__label">{c.label}</span>
              <span className="catbtn__count">{c.total} events</span>
            </span>
            {c.uncommented > 0 ? (
              <Badge tone="warning">{c.uncommented} action required</Badge>
            ) : (
              <Badge tone="success">All clear</Badge>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}
