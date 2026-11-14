import { motion, type PanInfo } from 'framer-motion';
import { useRef, useState } from 'react';
import type { Card } from '../lib/types';
import { pointsLabel, sizePoints } from '../lib/cards';
import { t } from '../lib/i18n';
import { sound } from '../lib/sound';
import { PlayingCard } from './PlayingCard';

// Apple's momentum projection: where would this flick come to rest?
const project = (velocity: number, decelerationRate = 0.998) => ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
const PLAY_THRESHOLD = -150; // projected resting point of a flick, px
const PLAY_DISTANCE = -70; // or a card physically pulled this far out of the hand
const TAP_SLOP = 12;

export default function Hand({
  deck,
  myVote,
  enabled,
  observer,
  storyKey,
  onPick,
}: {
  deck: Card[];
  myVote: string | null;
  enabled: boolean;
  observer: boolean;
  storyKey: string;
  onPick: (label: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const n = deck.length;
  const mid = (n - 1) / 2;
  const spread = Math.min(5.5, 52 / n);

  if (observer) {
    return (
      <div className="hand hand-observer">
        <span className="muted">{t.observingHint}</span>
      </div>
    );
  }

  return (
    <div className={`hand ${enabled ? '' : 'is-disabled'}`} role="group" aria-label={t.yourCards}>
      <div className="hand-fan" key={storyKey} style={{ ['--n' as string]: n }}>
        {deck.map((card, i) => {
          const offset = i - mid;
          const selected = myVote === card.label;
          const lifted = hovered === card.label && enabled;
          // Big decks (Modified Fibonacci has 13 cards) get a flatter arc so the outer cards stay on screen.
          const baseY = Math.abs(offset) ** 2 * 0.75 * Math.min(1, 10 / n) + (enabled ? 0 : 40);
          return (
            <motion.button
              key={card.label}
              className={`hand-card ${selected ? 'is-selected' : ''}`}
              style={{ zIndex: dragging === card.label ? 50 : lifted ? 40 : selected ? 30 : i }}
              // The button (the hit target) only ever sits at its fan position. Hover/selection lift moves
              // the card *inside* it, into the button's transparent headroom, so a quick press can never
              // start on one card and be released over a neighbour (which browsers turn into no click at all).
              initial={{ y: 160, opacity: 0, rotate: 0 }}
              animate={{ y: baseY, rotate: offset * spread, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.3, duration: 0.5, delay: hovered || dragging ? 0 : i * 0.025 }}
              onHoverStart={() => {
                if (enabled) {
                  setHovered(card.label);
                }
              }}
              onHoverEnd={() => setHovered((h) => (h === card.label ? null : h))}
              onPointerDown={(e) => {
                // Hold the pointer: the release (and therefore the click) always lands on the card that was
                // pressed, even if the pointer ends up over a neighbour or the frame loop is too starved for
                // the drag to have started yet.
                e.currentTarget.setPointerCapture?.(e.pointerId);
                pressStart.current = { x: e.clientX, y: e.clientY };
              }}
              onClick={(e) => {
                if (!enabled || dragging !== null) return; // a real drag is resolved in onDragEnd
                const start = pressStart.current;
                if (e.detail !== 0 && start) {
                  const dx = e.clientX - start.x;
                  const dy = e.clientY - start.y;
                  // moved, but not upward toward the table: the person changed their mind
                  if (Math.hypot(dx, dy) > TAP_SLOP && dy > -TAP_SLOP * 3) return;
                }
                onPick(card.label);
              }}
              disabled={!enabled}
              drag={enabled}
              dragSnapToOrigin
              dragElastic={0.6}
              dragTransition={{ bounceStiffness: 420, bounceDamping: 26 }}
              whileDrag={{ scale: 1.14, rotate: 0, zIndex: 60 }}
              onDragStart={() => {
                setDragging(card.label);
                sound.tap();
              }}
              onDragEnd={(_, info: PanInfo) => {
                const projected = info.offset.y + project(info.velocity.y);
                // Velocity can read near zero when frames are starved, so distance alone also counts as playing it.
                const played = projected < PLAY_THRESHOLD || info.offset.y < PLAY_DISTANCE;
                if (played && myVote !== card.label) onPick(card.label);
                setTimeout(() => setDragging(null), 50);
              }}
              aria-pressed={selected}
              aria-label={t.cardAria(card.label, pointsLabel(sizePoints(card)))}
            >
              <motion.span
                className="hand-card-lift"
                initial={false}
                animate={{ y: selected ? (enabled ? -34 : -10) : lifted ? -22 : 0, scale: lifted || (selected && enabled) ? 1.07 : 1 }}
                transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
              >
                <PlayingCard label={card.label} points={sizePoints(card)} faceUp size="md" highlight={selected} />
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
