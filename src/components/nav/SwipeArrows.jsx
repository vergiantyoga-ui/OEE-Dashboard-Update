import "./SwipeArrows.css";

/**
 * SwipeArrows — floating left/right chevron buttons for swipe-style page
 * navigation on tablets. Controlled entirely by the parent's `visible`
 * state: the parent shows them briefly on mount, on tap/swipe anywhere in
 * the content area, and hides them again after a few seconds of no
 * interaction (see App.jsx's `revealNav` / auto-hide timer).
 *
 * @param {boolean}  visible
 * @param {Function} onPrev
 * @param {Function} onNext
 */
export default function SwipeArrows({ visible, onPrev, onNext }) {
  return (
    <>
      <button
        className={`swipe-arrow swipe-arrow--left ${visible ? "is-visible" : ""}`}
        onClick={onPrev}
        aria-label="Previous page"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
      >
        ‹
      </button>
      <button
        className={`swipe-arrow swipe-arrow--right ${visible ? "is-visible" : ""}`}
        onClick={onNext}
        aria-label="Next page"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
      >
        ›
      </button>
    </>
  );
}
