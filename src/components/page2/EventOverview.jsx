import { useState } from "react";
import { Modal, Badge, Button } from "../ui";
import "./EventOverview.css";

/**
 * EventOverview (PRD Bab 8.2 / 8.3) — popup listing events that need
 * classification for one category, split into Uncommented (action required)
 * and Committed tabs. Rendered inside a Modal (opened from CategoryButtons).
 *
 * @param {boolean} open
 * @param {string}  title
 * @param {Array}   events   [{ id, range, durationMin | quantity, status, machine, reason }]
 * @param {Function} onClassify
 * @param {Function} onClose
 * @param {boolean} quantityKey  true for reject (Time/Quantity) vs downtime (Time Range/Duration)
 */
export default function EventOverview({
  open,
  title,
  events,
  onClassify,
  onClose,
  quantityKey = false,
}) {
  const [tab, setTab] = useState("uncommented");

  const uncommented = events.filter((e) => e.status === "uncommented");
  const committed = events.filter((e) => e.status !== "uncommented");
  const rows = tab === "uncommented" ? uncommented : committed;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${title} overview`}
      headerRight={
        uncommented.length > 0 && (
          <Badge tone="warning">{uncommented.length} action required</Badge>
        )
      }
    >
      <div className="evo">
        <div className="evo__tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "uncommented"}
            className={`evo__tab ${tab === "uncommented" ? "is-active" : ""}`}
            onClick={() => setTab("uncommented")}
          >
            Uncommented ({uncommented.length})
          </button>
          <button
            role="tab"
            aria-selected={tab === "committed"}
            className={`evo__tab ${tab === "committed" ? "is-active" : ""}`}
            onClick={() => setTab("committed")}
          >
            Committed ({committed.length})
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="evo__empty">
            {tab === "uncommented"
              ? "Nothing to classify. All events are committed."
              : "No committed events yet."}
          </p>
        ) : (
          <ul className="evo__list">
            {rows.map((e) => (
              <li className="evo__row" key={e.id}>
                <div className="evo__cell">
                  <span className="evo__k">
                    {quantityKey ? "Time" : "Time Range"}
                  </span>
                  <strong>{e.range}</strong>
                </div>
                <div className="evo__cell">
                  <span className="evo__k">
                    {quantityKey ? "Quantity" : "Duration"}
                  </span>
                  <strong>
                    {quantityKey ? `${e.quantity} pcs` : `${e.durationMin} min`}
                  </strong>
                </div>
                <div className="evo__cell">
                  <span className="evo__k">Status</span>
                  {e.status === "uncommented" ? (
                    <Badge tone="danger">Action Required</Badge>
                  ) : (
                    <Badge tone="success">Committed</Badge>
                  )}
                </div>
                <div className="evo__cell evo__cell--action">
                  {e.status === "uncommented" ? (
                    <Button variant="primary" size="sm" onClick={() => onClassify?.(e)}>
                      Classify
                    </Button>
                  ) : (
                    <span className="evo__reason">{e.reason}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
