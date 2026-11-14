import { AnimatePresence, motion } from 'framer-motion';
import { forwardRef, useCallback, useImperativeHandle, useState, type MutableRefObject } from 'react';
import { sound } from '../lib/sound';

export type EffectsHandle = {
  cheer: (fromId: string, emoji: string) => void;
  throwAt: (fromId: string, targetId: string, emoji: string) => void;
};

type Floater = { id: number; kind: 'cheer'; emoji: string; x: number; y: number; drift: number };
type Projectile = { id: number; kind: 'throw'; emoji: string; from: { x: number; y: number }; to: { x: number; y: number }; targetId: string };
type Burst = { id: number; kind: 'burst'; emoji: string; x: number; y: number };
type Item = Floater | Projectile | Burst;

let seq = 1;

function centerOf(el: HTMLElement | undefined) {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const avatar = el.querySelector('.seat-avatar') ?? el;
  const r = avatar.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Overlay for the playful stuff: emoji floating up from a seat, and things thrown across the table. */
const EffectsLayer = forwardRef<EffectsHandle, { seatRefs: MutableRefObject<Map<string, HTMLElement>> }>(function EffectsLayer({ seatRefs }, ref) {
  const [items, setItems] = useState<Item[]>([]);
  const remove = useCallback((id: number) => setItems((list) => list.filter((i) => i.id !== id)), []);

  useImperativeHandle(
    ref,
    () => ({
      cheer(fromId, emoji) {
        const { x, y } = centerOf(seatRefs.current.get(fromId));
        const batch: Floater[] = Array.from({ length: 3 }, (_, k) => ({ id: seq++, kind: 'cheer', emoji, x: x + (k - 1) * 10, y, drift: (Math.random() - 0.5) * 80 }));
        setItems((list) => [...list.slice(-60), ...batch]);
      },
      throwAt(fromId, targetId, emoji) {
        const from = centerOf(seatRefs.current.get(fromId));
        const to = centerOf(seatRefs.current.get(targetId));
        sound.whoosh();
        setItems((list) => [...list.slice(-60), { id: seq++, kind: 'throw', emoji, from, to, targetId }]);
      },
    }),
    [seatRefs],
  );

  return (
    <div className="effects-layer" aria-hidden>
      <AnimatePresence>
        {items.map((item) => {
          if (item.kind === 'cheer') {
            return (
              <motion.span
                key={item.id}
                className="fx fx-cheer"
                style={{ left: item.x, top: item.y }}
                initial={{ opacity: 0, scale: 0.3, x: '-50%', y: '-50%' }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.3, 1.1, 0.9], x: ['-50%', `calc(-50% + ${item.drift}px)`], y: ['-50%', 'calc(-50% - 160px)'] }}
                transition={{ duration: 1.6, ease: [0.2, 0.8, 0.3, 1], delay: Math.random() * 0.15 }}
                onAnimationComplete={() => remove(item.id)}
              >
                {item.emoji}
              </motion.span>
            );
          }
          if (item.kind === 'throw') {
            const dx = item.to.x - item.from.x;
            const dy = item.to.y - item.from.y;
            const arc = Math.min(220, 80 + Math.hypot(dx, dy) * 0.25);
            return (
              <motion.span
                key={item.id}
                className="fx fx-throw"
                style={{ left: item.from.x, top: item.from.y }}
                initial={{ x: '-50%', y: '-50%', scale: 0.6 }}
                animate={{
                  x: ['-50%', `calc(-50% + ${dx * 0.5}px)`, `calc(-50% + ${dx}px)`],
                  y: ['-50%', `calc(-50% + ${dy * 0.5 - arc}px)`, `calc(-50% + ${dy}px)`],
                  rotate: [0, 360, 720],
                  scale: [0.6, 1.5, 1],
                }}
                transition={{ duration: 0.75, ease: 'easeInOut', times: [0, 0.5, 1] }}
                onAnimationComplete={() => {
                  remove(item.id);
                  sound.bonk();
                  window.dispatchEvent(new CustomEvent('huddle:hit', { detail: item.targetId }));
                  setItems((list) => [...list, { id: seq++, kind: 'burst', emoji: item.emoji, x: item.to.x, y: item.to.y }]);
                }}
              >
                {item.emoji}
              </motion.span>
            );
          }
          return (
            <motion.span key={item.id} className="fx fx-burst" style={{ left: item.x, top: item.y }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} onAnimationComplete={() => remove(item.id)}>
              {Array.from({ length: 6 }).map((_, k) => {
                const a = (k / 6) * Math.PI * 2;
                return (
                  <motion.i key={k} initial={{ x: 0, y: 0, scale: 0.8 }} animate={{ x: Math.cos(a) * 46, y: Math.sin(a) * 46, scale: 0.2 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
                    {item.emoji}
                  </motion.i>
                );
              })}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
});

export default EffectsLayer;
