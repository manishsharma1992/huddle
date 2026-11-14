import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n';

/** One stop on the tour. `target` is a CSS selector list; the first visible match is spotlit. */
export type TourStep = { target?: string; title: string; body: string };

type Box = { top: number; left: number; width: number; height: number };

const PAD = 8;
const CARD_W = 340;

function visibleTarget(selector: string | undefined): HTMLElement | null {
  if (!selector) return null;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') return el;
  }
  return null;
}

/**
 * A guided tour: dims the page, spotlights one element at a time and explains it in a small card.
 * Steps whose element isn't on screen (say, the hand for an observer) show as a centred card instead.
 */
export default function Tour({ steps, onClose, label }: { steps: TourStep[]; onClose: () => void; label: string }) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const reduceMotion = useReducedMotion();
  const primary = useRef<HTMLButtonElement | null>(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  const measure = useCallback(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight });
    const el = visibleTarget(step?.target);
    if (!el) return setBox(null);
    const r = el.getBoundingClientRect();
    // Clamp to the viewport so a tall element (the backlog) still leaves room for the card.
    const top = Math.max(PAD, r.top - PAD);
    const bottom = Math.min(window.innerHeight - PAD, r.bottom + PAD);
    setBox({ top, left: Math.max(PAD, r.left - PAD), width: Math.min(window.innerWidth - 2 * PAD, r.width + 2 * PAD), height: Math.max(0, bottom - top) });
  }, [step]);

  // Bring the target into view, then measure; keep measuring while the layout moves.
  useLayoutEffect(() => {
    const el = visibleTarget(step?.target);
    el?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    measure();
    const settle = window.setTimeout(measure, reduceMotion ? 0 : 380);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, measure, reduceMotion]);

  useEffect(() => {
    primary.current?.focus();
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab') {
        // Keep keyboard focus inside the card while the page behind is dimmed.
        const items = Array.from(document.querySelectorAll<HTMLElement>('.tour-card button'));
        if (!items.length) return;
        const at = items.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        items[(at + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
      } else if (e.key === 'ArrowRight' && !last) setIndex((i) => i + 1);
      else if (e.key === 'ArrowLeft' && index > 0) setIndex((i) => i - 1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [index, last, onClose]);

  if (!step) return null;

  // Card placement: docked on phones; below or above the spotlight on wider screens.
  const phone = viewport.w <= 640;
  let cardStyle: React.CSSProperties;
  if (!box) {
    cardStyle = { left: '50%', top: '50%', translate: '-50% -50%', width: Math.min(CARD_W + 40, viewport.w - 24) };
  } else if (phone) {
    const targetInBottomHalf = box.top + box.height / 2 > viewport.h / 2;
    cardStyle = targetInBottomHalf ? { left: 12, right: 12, top: 12 } : { left: 12, right: 12, bottom: 12 };
  } else {
    const below = viewport.h - (box.top + box.height) > 220;
    const left = Math.min(Math.max(12, box.left + box.width / 2 - CARD_W / 2), viewport.w - CARD_W - 12);
    cardStyle = below ? { left, top: box.top + box.height + 12, width: CARD_W } : { left, bottom: viewport.h - box.top + 12, width: CARD_W };
  }

  return (
    <div className="tour" role="presentation">
      {box ? (
        <div
          className={`tour-spotlight ${reduceMotion ? '' : 'is-animated'}`}
          style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
          aria-hidden
        />
      ) : (
        <div className="tour-dim" aria-hidden />
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          className="tour-card"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          aria-labelledby="tour-title"
          aria-describedby="tour-body"
          style={cardStyle}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        >
          <span className="tour-count">{t.tourStep(index + 1, steps.length)}</span>
          <h2 id="tour-title" className="tour-title">
            {step.title}
          </h2>
          <p id="tour-body" className="tour-body">
            {step.body}
          </p>
          <div className="tour-actions">
            {last ? (
              <span />
            ) : (
              <button type="button" className="link tour-skip" onClick={onClose}>
                {t.tourSkip}
              </button>
            )}
            <span className="tour-nav">
              {index > 0 && (
                <button type="button" className="btn btn-soft btn-sm" onClick={() => setIndex((i) => i - 1)}>
                  {t.tourBack}
                </button>
              )}
              <button
                ref={primary}
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => (last ? onClose() : setIndex((i) => i + 1))}
              >
                {last ? t.tourDone : t.tourNext}
              </button>
            </span>
          </div>
          <div className="tour-dots" aria-hidden>
            {steps.map((_, i) => (
              <i key={i} className={i === index ? 'is-on' : ''} />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Builds a tour from the i18n step table, filling in {name}. */
export function buildSteps(table: Record<string, string[]>, order: [string, string | undefined][], name = ''): TourStep[] {
  return order.map(([key, target]) => ({
    target,
    title: table[key][0].replace('{name}', name),
    body: table[key][1],
  }));
}
