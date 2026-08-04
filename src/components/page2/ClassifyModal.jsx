import { useState, useEffect, useMemo } from "react";
import { Modal, Button, Badge, ProgressBar } from "../ui";
import { MACHINES } from "../../data/mockData.js";
import { hmToMinutes, minutesToHm } from "../../lib/format.js";
import "./ClassifyModal.css";

/**
 * ClassifyModal (PRD Bab 8.2 / 8.3) — category → reason → machine → time → notes.
 * Reused for downtime, minor stop, speed loss, and reject classification.
 *
 * For time-based kinds (downtime / minorstop / speedloss), the event's total
 * duration can be split across MULTIPLE causes, one time-segment each:
 *   - Start Time is locked to wherever the previous cause left off (or the
 *     event's original start, for the first cause) — not user-editable.
 *   - End Time is editable but poka-yoke'd: it can never go past the event's
 *     original end time, and never before the current Start Time. Native
 *     min/max on the time input plus a JS clamp on change enforce this even
 *     if the browser's own control would otherwise allow it.
 *   - Adding a cause advances Start Time to that cause's End Time, so the
 *     next cause picks up exactly where the last one stopped — no gaps, no
 *     overlaps, until the whole event duration is accounted for.
 *
 * Reject keeps its existing quantity-based flow (unaffected by this change).
 *
 * @param {string} kind         "downtime" | "minorstop" | "speedloss" | "reject"
 * @param {Array}  categories   [{ id, label, reasons: [] }]
 * @param {object} context      { range, durationMin, machine, quantity, startTime, endTime }
 */
export default function ClassifyModal({
  open,
  onClose,
  onSave,
  kind = "downtime",
  categories = [],
  context = {},
}) {
  const isReject = kind === "reject";
  const title =
    kind === "downtime"
      ? "Edit Downtime"
      : kind === "minorstop"
      ? "Edit Minor Stop"
      : kind === "speedloss"
      ? "Edit Speed Loss"
      : "Edit Reject";

  const overallStart =
    context.startTime ?? context.range?.split(" - ")[0] ?? "";
  const overallEnd = context.endTime ?? context.range?.split(" - ")[1] ?? "";
  const totalMinutes =
    context.durationMin ??
    Math.max(0, (hmToMinutes(overallEnd) ?? 0) - (hmToMinutes(overallStart) ?? 0));

  const [catId, setCatId] = useState(categories[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [machine, setMachine] = useState(context.machine ?? MACHINES[0].id);
  const [quantity, setQuantity] = useState(context.quantity ?? 0);
  const [notes, setNotes] = useState("");
  const [causes, setCauses] = useState([]);

  // the segment currently being defined (time-based kinds only)
  const [segStart, setSegStart] = useState(overallStart);
  const [segEnd, setSegEnd] = useState(overallEnd);

  // reset when opened with a new context
  useEffect(() => {
    if (open) {
      setCatId(categories[0]?.id ?? "");
      setReason("");
      setMachine(context.machine ?? MACHINES[0].id);
      setQuantity(context.quantity ?? 0);
      setNotes("");
      setCauses([]);
      setSegStart(overallStart);
      setSegEnd(overallEnd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const activeCat = categories.find((c) => c.id === catId) ?? categories[0];

  const coveredMinutes = useMemo(() => {
    const s = hmToMinutes(overallStart);
    const cur = hmToMinutes(segStart);
    if (s == null || cur == null) return 0;
    return Math.max(0, cur - s);
  }, [segStart, overallStart]);

  const fullyClassified = isReject
    ? causes.length > 0
    : totalMinutes > 0 && coveredMinutes >= totalMinutes;

  const classified = isReject ? causes.length > 0 : fullyClassified;

  // poka-yoke: clamp End Time to [segStart + 1min, overallEnd] on every change
  function handleEndTimeChange(value) {
    const startMins = hmToMinutes(segStart);
    const maxMins = hmToMinutes(overallEnd);
    let mins = hmToMinutes(value);
    if (mins == null || startMins == null || maxMins == null) {
      setSegEnd(value);
      return;
    }
    if (mins <= startMins) mins = Math.min(startMins + 1, maxMins);
    if (mins > maxMins) mins = maxMins;
    setSegEnd(minutesToHm(mins));
  }

  function addCause() {
    if (!reason) return;
    if (!isReject) {
      setCauses((cs) => [
        ...cs,
        { reason, machine, category: activeCat?.label, startTime: segStart, endTime: segEnd },
      ]);
      // advance the segment: next cause's start = this cause's end (poka-yoke:
      // guarantees no gap and no overlap between consecutive causes)
      const nextStart = segEnd;
      setSegStart(nextStart);
      const nextStartMins = hmToMinutes(nextStart);
      const maxMins = hmToMinutes(overallEnd);
      setSegEnd(
        nextStartMins != null && maxMins != null && nextStartMins < maxMins
          ? overallEnd
          : nextStart
      );
    } else {
      setCauses((cs) => [...cs, { reason, machine, category: activeCat?.label }]);
    }
    setReason("");
  }

  function removeLastCause() {
    setCauses((cs) => {
      if (cs.length === 0) return cs;
      const last = cs[cs.length - 1];
      if (!isReject && last.startTime) setSegStart(last.startTime);
      if (!isReject) setSegEnd(overallEnd);
      return cs.slice(0, -1);
    });
  }

  const timeExhausted = !isReject && coveredMinutes >= totalMinutes && totalMinutes > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={
        isReject
          ? `${context.quantity ?? 0} pcs to classify`
          : `${context.range ?? ""} · ${context.durationMin ?? 0} mins duration`
      }
      wide
      headerRight={
        <Badge
          tone={
            kind === "reject"
              ? "danger"
              : kind === "minorstop" || kind === "speedloss"
              ? "warning"
              : "danger"
          }
        >
          {kind === "minorstop"
            ? "MINOR STOP"
            : kind === "speedloss"
            ? "SPEED LOSS"
            : kind === "reject"
            ? "REJECT"
            : "DOWNTIME"}
        </Badge>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onSave?.({ causes, notes })}
            disabled={!classified}
          >
            Save Classification
          </Button>
        </>
      }
    >
      <div className="cls">
        <input
          className="cls__search"
          placeholder={`Search ${isReject ? "reject" : "downtime"} reason…`}
          aria-label="Search reason"
        />

        <div className="cls__cols">
          {/* Categories */}
          <div className="cls__col">
            <h4 className="cls__col-title">Categories</h4>
            <ul className="cls__list">
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    className={`cls__cat ${catId === c.id ? "is-active" : ""}`}
                    onClick={() => {
                      setCatId(c.id);
                      setReason("");
                    }}
                  >
                    {c.label}
                    <span aria-hidden>›</span>
                  </button>
                </li>
              ))}
            </ul>

            <h4 className="cls__col-title cls__col-title--gap">Machine</h4>
            <div className="cls__machines">
              {MACHINES.map((m) => (
                <button
                  key={m.id}
                  className={`cls__machine ${machine === m.id ? "is-active" : ""}`}
                  onClick={() => setMachine(m.id)}
                >
                  {m.id}
                </button>
              ))}
            </div>
          </div>

          {/* Reasons */}
          <div className="cls__col">
            <h4 className="cls__col-title">
              Reasons: {activeCat?.label ?? ""}
            </h4>
            <ul className="cls__list">
              {(activeCat?.reasons ?? []).map((r) => (
                <li key={r}>
                  <button
                    className={`cls__reason ${reason === r ? "is-active" : ""}`}
                    onClick={() => setReason(r)}
                    disabled={timeExhausted}
                  >
                    {reason === r && <span className="cls__check" aria-hidden>✓</span>}
                    {r}
                  </button>
                </li>
              ))}
            </ul>

            {isReject ? (
              <div className="cls__field">
                <label htmlFor="cls-qty">Quantity (pcs)</label>
                <input
                  id="cls-qty"
                  type="number"
                  value={quantity}
                  min={0}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
            ) : timeExhausted ? (
              <p className="cls__done">
                ✓ Full duration classified ({totalMinutes} / {totalMinutes} min). Remove
                the last cause below to adjust.
              </p>
            ) : (
              <div className="cls__times">
                <div className="cls__field">
                  <label htmlFor="cls-start">Start Time</label>
                  <input id="cls-start" value={segStart} readOnly />
                  <span className="cls__hint">Locked — continues from the last cause</span>
                </div>
                <div className="cls__field">
                  <label htmlFor="cls-end">End Time</label>
                  <input
                    id="cls-end"
                    type="time"
                    value={segEnd}
                    min={segStart}
                    max={overallEnd}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                  />
                  <span className="cls__hint">Max {overallEnd} (event end)</span>
                </div>
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={addCause}
              disabled={!reason || timeExhausted}
            >
              + Add cause
            </Button>
          </div>

          {/* Cause list */}
          <div className="cls__col">
            <h4 className="cls__col-title">Cause List</h4>
            {causes.length === 0 ? (
              <p className="cls__empty">
                No causes yet. Pick a reason and add it to classify this event.
              </p>
            ) : (
              <ul className="cls__causes">
                {causes.map((c, i) => (
                  <li key={i} className="cls__cause">
                    <div>
                      <strong>{c.reason}</strong>
                      <span>
                        {!isReject && c.startTime && c.endTime
                          ? `${c.startTime} - ${c.endTime} · `
                          : ""}
                        Machine: {c.machine}
                      </span>
                    </div>
                    {i === causes.length - 1 && (
                      <button
                        className="cls__cause-remove"
                        onClick={removeLastCause}
                        aria-label={`Remove ${c.reason}`}
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {!isReject && totalMinutes > 0 && (
              <div className="cls__connect">
                <div className="cls__connect-head">
                  <span>Connect Time</span>
                  <strong>
                    {Math.min(coveredMinutes, totalMinutes)} / {totalMinutes} min
                  </strong>
                </div>
                <ProgressBar
                  value={Math.min(coveredMinutes, totalMinutes)}
                  max={totalMinutes}
                  color="var(--c-green)"
                  height={6}
                  label="Time classified"
                />
              </div>
            )}

            <div className="cls__status">
              <span className="cls__status-label">Classification Status</span>
              <Badge tone={classified ? "success" : "warning"}>
                {classified ? "✓ Fully Classified" : "Action Required"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="cls__field">
          <label htmlFor="cls-notes">Notes</label>
          <textarea
            id="cls-notes"
            rows={2}
            placeholder="Add investigation notes, root cause analysis, corrective actions, or operator comments…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
