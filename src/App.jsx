import { useState, useRef, useEffect } from "react";
import DashboardHeader from "./components/header/DashboardHeader.jsx";
import PageIndicator from "./components/nav/PageIndicator.jsx";
import SwipeArrows from "./components/nav/SwipeArrows.jsx";
import Toast from "./components/ui/Toast.jsx";
import Page1Kpi from "./pages/Page1Kpi.jsx";
import Page2Reason from "./pages/Page2Reason.jsx";
import Page3Reject from "./pages/Page3Reject.jsx";
import "./App.css";

const PAGES = [
  { id: "kpi", label: "Dashboard KPI OEE", icon: "▦" },
  { id: "reason", label: "Input Reason OEE", icon: "◫" },
  { id: "reject", label: "Reject 7-Segments", icon: "◔" },
];

const AUTO_HIDE_MS = 3000;
const SWIPE_THRESHOLD_PX = 50;

/**
 * Page navigation: tablets get swipe-left/right + floating tap-to-reveal
 * arrows instead of a top tab row (replaces the old `app__tabs`). The
 * arrows show briefly on load, reappear on any tap/swipe in the content
 * area, and auto-hide after a few seconds of inactivity so they don't
 * permanently cover content. The left icon rail (`app__sidebar`) is a
 * separate, unrelated affordance and is unchanged.
 */
export default function App() {
  const [page, setPage] = useState("kpi");
  const [toast, setToast] = useState("");
  const [arrowsVisible, setArrowsVisible] = useState(true);

  const hideTimer = useRef(null);
  const touchX = useRef(null);

  function revealArrows() {
    setArrowsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setArrowsVisible(false), AUTO_HIDE_MS);
  }

  // show briefly on first load so the affordance is discoverable, then hide
  useEffect(() => {
    revealArrows();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goTo(delta) {
    const idx = PAGES.findIndex((p) => p.id === page);
    const next = (idx + delta + PAGES.length) % PAGES.length;
    setPage(PAGES[next].id);
    revealArrows();
  }

  function handleTouchStart(e) {
    touchX.current = e.touches[0].clientX;
    revealArrows();
  }

  function handleTouchEnd(e) {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX) goTo(dx < 0 ? 1 : -1);
    touchX.current = null;
  }

  return (
    <div className="app">
      <aside className="app__sidebar" aria-label="Main navigation">
        <div className="app__logo" title="MES FRO">
          <span>OEE</span>
        </div>
        <nav className="app__nav">
          {PAGES.map((p) => (
            <button
              key={p.id}
              className={`app__nav-item ${page === p.id ? "is-active" : ""}`}
              onClick={() => setPage(p.id)}
              aria-current={page === p.id ? "page" : undefined}
              title={p.label}
            >
              <span className="app__nav-icon" aria-hidden>
                {p.icon}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="app__main">
        <DashboardHeader />
        <PageIndicator pages={PAGES} activeId={page} />

        <main
          className="app__content"
          onClick={revealArrows}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {page === "kpi" && <Page1Kpi onToast={setToast} />}
          {page === "reason" && <Page2Reason onToast={setToast} />}
          {page === "reject" && <Page3Reject onToast={setToast} />}
        </main>
      </div>

      <SwipeArrows visible={arrowsVisible} onPrev={() => goTo(-1)} onNext={() => goTo(1)} />

      <Toast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
}
