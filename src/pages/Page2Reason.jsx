import { useMemo, useState } from "react";
import { Card } from "../components/ui";
import StackedTimeline from "../components/page2/StackedTimeline.jsx";
import CategoryButtons from "../components/page2/CategoryButtons.jsx";
import EventOverview from "../components/page2/EventOverview.jsx";
import ClassifyModal from "../components/page2/ClassifyModal.jsx";
import {
  buildTimeline,
  REJECT_EVENTS,
  DOWNTIME_CATEGORIES,
  REJECT_CATEGORIES,
} from "../data/mockData.js";
import "./Page2Reason.css";

const TIME_WINDOWS = [
  { id: 0, label: "07:00 – 15:00", start: 7 },
  { id: 1, label: "16:00 – 23:00", start: 16 },
  { id: 2, label: "00:00 – 06:00", start: 0 },
];

/** Pull every band of a given window-classification code out of the current
 * timeline rows, in the exact shape EventOverview / ClassifyModal expect.
 * This is the single source of truth for time ranges: Downtime, Minor Stop,
 * and Speed Loss popups always show the same start/end times as the bars on
 * Production Timeline Detail, because they're read from the same bands.
 */
function deriveCategoryEvents(rows, code) {
  return rows.flatMap((row) =>
    row.bands
      .filter((b) => b.code === code)
      .map((b) => ({
        id: b.id,
        range: `${b.startTime} - ${b.endTime}`,
        startTime: b.startTime,
        endTime: b.endTime,
        durationMin: b.minutes,
        machine: b.machine,
        reason: b.reason,
        status: b.reason ? "planned" : "uncommented",
      }))
  );
}

/**
 * Page 2 — Input Reason OEE (PRD Bab 8, restructured per user request).
 *
 * 4 category buttons (Downtime / Minor Stop / Speed Loss / Reject-Scrap)
 * sit above the timeline as a quick-access summary. Downtime, Minor Stop,
 * and Speed Loss events are DERIVED from the timeline bands (not a separate
 * mock list) so their time ranges are always consistent with the bar chart.
 * Reject/Scrap has no bar-chart representation, so it keeps its own event
 * list. Classifying from a popup or directly from a bar both write into the
 * same `reasonMap`, so either path updates the timeline label immediately.
 */
export default function Page2Reason({ onToast }) {
  const [pageIdx, setPageIdx] = useState(0);

  // saved reasons keyed by `${pageIdx}:${bandId}` -> reason label
  const [reasonMap, setReasonMap] = useState({});

  const rows = useMemo(() => {
    const built = buildTimeline(TIME_WINDOWS[pageIdx].start, 8, 42 + pageIdx);
    return built.map((row) => ({
      ...row,
      bands: row.bands.map((b) => {
        const saved = reasonMap[`${pageIdx}:${b.id}`];
        return saved ? { ...b, reason: saved } : b;
      }),
    }));
  }, [pageIdx, reasonMap]);

  const downtimeEvents = useMemo(() => deriveCategoryEvents(rows, "D"), [rows]);
  const minorStopEvents = useMemo(() => deriveCategoryEvents(rows, "MS"), [rows]);
  const speedLossEvents = useMemo(() => deriveCategoryEvents(rows, "SL"), [rows]);

  // Reject/Scrap has no bar on the timeline, so it stays its own mock state.
  const [rejectEvents, setRejectEvents] = useState(REJECT_EVENTS);

  const CATEGORY_CONFIG = {
    downtime: {
      key: "downtime",
      label: "Downtime",
      glyph: "D",
      tone: "danger",
      events: downtimeEvents,
      quantityKey: false,
    },
    minorstop: {
      key: "minorstop",
      label: "Minor Stop",
      glyph: "MS",
      tone: "warning",
      events: minorStopEvents,
      quantityKey: false,
    },
    speedloss: {
      key: "speedloss",
      label: "Speed Loss",
      glyph: "SL",
      tone: "warning",
      events: speedLossEvents,
      quantityKey: false,
    },
    reject: {
      key: "reject",
      label: "Reject / Scrap",
      glyph: "RJ",
      tone: "danger",
      events: rejectEvents,
      quantityKey: true,
    },
  };

  const buttonData = Object.values(CATEGORY_CONFIG).map((c) => ({
    key: c.key,
    label: c.label,
    glyph: c.glyph,
    tone: c.tone,
    total: c.events.length,
    uncommented: c.events.filter((e) => e.status === "uncommented").length,
  }));

  // which category popup is open (null | "downtime" | "minorstop" | "speedloss" | "reject")
  const [openCategory, setOpenCategory] = useState(null);
  // the classify modal (opened either from a popup row, or directly from the timeline)
  const [modal, setModal] = useState(null);

  function classifyFromPopup(categoryKey, event) {
    setOpenCategory(null); // close the list popup first, per approved mockup

    if (categoryKey === "reject") {
      setModal({
        kind: "reject",
        categories: REJECT_CATEGORIES,
        context: { quantity: event.quantity, range: event.range },
        commit: () =>
          setRejectEvents((list) =>
            list.map((e) =>
              e.id === event.id
                ? { ...e, status: "planned", reason: "Classified" }
                : e
            )
          ),
      });
      return;
    }

    // downtime / minorstop / speedloss: event.id IS the timeline band id, so
    // committing writes straight into reasonMap — same mechanism as clicking
    // the bar directly — keeping both views in sync.
    setModal({
      kind: categoryKey,
      categories: DOWNTIME_CATEGORIES,
      context: {
        range: event.range,
        startTime: event.startTime,
        endTime: event.endTime,
        durationMin: event.durationMin,
        machine: event.machine,
      },
      commit: (payload) => {
        const label =
          payload?.causes?.[0]?.reason ||
          payload?.causes?.[0]?.category ||
          "Classified";
        setReasonMap((m) => ({ ...m, [`${pageIdx}:${event.id}`]: label }));
      },
    });
  }

  function openFromBand(band, row) {
    const kind =
      band.code === "D" ? "downtime" : band.code === "SL" ? "speedloss" : "minorstop";
    setModal({
      kind,
      categories: DOWNTIME_CATEGORIES,
      context: {
        range: `${band.startTime} - ${band.endTime}`,
        startTime: band.startTime,
        endTime: band.endTime,
        durationMin: band.minutes,
        machine: band.machine,
      },
      commit: (payload) => {
        const label =
          payload?.causes?.[0]?.reason ||
          payload?.causes?.[0]?.category ||
          "Classified";
        setReasonMap((m) => ({ ...m, [`${pageIdx}:${band.id}`]: label }));
      },
    });
  }

  const activePopup = openCategory ? CATEGORY_CONFIG[openCategory] : null;

  return (
    <div className="page2">
      <CategoryButtons categories={buttonData} onOpen={setOpenCategory} />

      <Card
        title="Production Timeline Detail"
        action={
          <div className="page2__pager">
            <button
              className="page2__pager-btn"
              onClick={() => setPageIdx((i) => Math.max(0, i - 1))}
              disabled={pageIdx === 0}
              aria-label="Previous time window"
            >
              ‹
            </button>
            <span className="page2__pager-label">{TIME_WINDOWS[pageIdx].label}</span>
            <button
              className="page2__pager-btn"
              onClick={() =>
                setPageIdx((i) => Math.min(TIME_WINDOWS.length - 1, i + 1))
              }
              disabled={pageIdx === TIME_WINDOWS.length - 1}
              aria-label="Next time window"
            >
              ›
            </button>
          </div>
        }
      >
        <StackedTimeline rows={rows} onBand={openFromBand} />
        <p className="page2__hint">
          Tip: click a red (downtime) or yellow / orange (speed / minor stop)
          segment to record a reason. Hover any segment for its production
          signal.
        </p>
      </Card>

      {activePopup && (
        <EventOverview
          open={!!activePopup}
          title={activePopup.label}
          events={activePopup.events}
          quantityKey={activePopup.quantityKey}
          onClose={() => setOpenCategory(null)}
          onClassify={(event) => classifyFromPopup(activePopup.key, event)}
        />
      )}

      {modal && (
        <ClassifyModal
          open={!!modal}
          kind={modal.kind}
          categories={modal.categories}
          context={modal.context}
          onClose={() => setModal(null)}
          onSave={(payload) => {
            modal.commit?.(payload);
            setModal(null);
            onToast?.("Classification saved");
          }}
        />
      )}
    </div>
  );
}
