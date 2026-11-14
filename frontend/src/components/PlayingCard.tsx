import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { pointsLabel } from '../lib/cards';

/** Visual playing card. `faceUp` drives a real 3D flip so turning cards feels physical. */
export function PlayingCard({
  label,
  faceUp,
  size = 'md',
  highlight = false,
  delay = 0,
  tint,
  points = null,
}: {
  label: string | null;
  faceUp: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  highlight?: boolean;
  delay?: number;
  tint?: number;
  /** Story points behind a size card (XS, M, …); shown as a caption under the size. */
  points?: number | null;
}) {
  return (
    <div
      className={`pcard pcard-${size} ${highlight ? 'is-highlight' : ''} ${points !== null ? 'is-size' : ''} ${label && label.length > 2 ? 'is-long' : ''}`} style={tint !== undefined ? ({ '--tint': tint } as CSSProperties) : undefined}>
      <motion.div
        className="pcard-inner"
        initial={false}
        animate={{ rotateY: faceUp ? 180 : 0 }}
        transition={{ type: 'spring', bounce: 0.25, duration: 0.7, delay }}
      >
        <div className="pcard-back" aria-hidden={faceUp}>
          <span className="pcard-back-mark">H</span>
        </div>
        <div className="pcard-face" aria-hidden={!faceUp}>
          <span className="pcard-corner">{label}</span>
          <span className="pcard-value">
            {label}
            {points !== null && <span className="pcard-points">{pointsLabel(points)}</span>}
          </span>
          <span className="pcard-corner pcard-corner-b">{label}</span>
        </div>
      </motion.div>
    </div>
  );
}
