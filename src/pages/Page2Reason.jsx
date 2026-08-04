import { useMemo, useState } from "react";
import { Card } from "../components/ui";
import StackedTimeline from "../components/page2/StackedTimeline.jsx";
import CategoryButtons from "../components/page2/CategoryButtons.jsx";
import EventOverview from "../components/page2/EventOverview.jsx";
import ClassifyModal from "../components/page2/ClassifyModal.jsx";
import {
  buildTimeline,
  DOWNTIME_EVENTS,
  MAJOR_STOP_EVENTS,
  SPEED_LOSS_EVENTS,
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

/**
 * Page 2 — Input Reason OEE (PRD Bab 8, restructured per user request).
 *
 * Layout:
 *  1. CategoryButtons  — 4 quick-access buttons (Downtime / Major Stop /
 *     Speed Loss / Reject-Scrap) as a summary strip above the timeline.
 *     Clicking one opens that category's list as a popup (EventOverview),
 *     replacing the old always-visible two-card layout.
 *  2. Production Timeline — unchanged; clicking a red/yellow/orange segment
 *     still opens the classify modal directly.
 *
 * From the popup, clicking "Classify" closes the popup and opens the shared
 * ClassifyModal (category → reason → machine → notes), matching the flow
 * shown in the approved mockup.
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

  // 4 category event lists, each independently stateful
  const [downtimeEvents, setDowntimeEvents] = useState(DOWNTIME_EVENTS);
  const [majorStopEvents, setMajorStopEvents] = useState(MAJOR_STOP_EVENTS);
  const [speedLossEvents, setSpeedLossEvents] = useState(SPEED_LOSS_EVENTS);
  const [rejectEvents, setRejectEvents] = useState(REJECT_EVENTS);

  const CATEGORY_CONFIG = {
    downtime: {
      key: "downtime",
      label: "Downtime",
      glyph: "D",
      tone: "danger",
      events: downtimeEvents,
      setEvents: setDowntimeEvents,
      categories: DOWNTIME_CATEGORIES,
      quantityKey: false,
    },
    majorstop: {
      key: "majorstop",
      label: "Major Stop",
      glyph: "MS",
      tone: "warning",
      events: majorStopEvents,
      setEvents: setMajorStopEvents,
      categories: DOWNTIME_CATEGORIES,
      quantityKey: false,
    },
    speedloss: {
      key: "speedloss",
      label: "Speed Loss",
      glyph: "SL",
      tone: "warning",
      events: speedLossEvents,
      setEvents: setSpeedLossEvents,
      categories: DOWNTIME_CATEGORIES,
      quantityKey: false,
    },
    reject: {
      key: "reject",
      label: "Reject / Scrap",
      glyph: "RJ",
      tone: "danger",
      events: rejectEvents,
      setEvents: setRejectEvents,
      categories: REJECT_CATEGORIES,
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

  // which category popup is open (null | "downtime" | "majorstop" | "speedloss" | "reject")
  const [openCategory, setOpenCategory] = useState(null);
  // the classify modal (opened either from a popup row, or directly from the timeline)
  const [modal, setModal] = useState(null);

  function classifyFromPopup(categoryKey, event) {
    const cfg = CATEGORY_CONFIG[categoryKey];
    setOpenCategory(null); // close the list popup first, per approved mockup
    setModal({
      kind: categoryKey === "reject" ? "reject" : "downtime",
      categories: cfg.categories,
      context: cfg.quantityKey
        ? { quantity: event.quantity, range: event.range }
        : { range: event.range, durationMin: event.durationMin, machine: event.machine },
      commit: () =>
        cfg.setEvents((list) =>
          list.map((e) =>
            e.id === event.id
              ? { ...e, status: "planned", reason: "Classified" }
              : e
          )
        ),
    });
  }

  function openFromBand(band, row) {
    const kind = band.code === "D" ? "downtime" : "minorstop";
    setModal({
      kind,
      categories: DOWNTIME_CATEGORIES,
      context: { range: `${band.startTime} - ${band.endTime}`, startTime: band.startTime, endTime: band.endTime, durationMin: band.minutes },
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
