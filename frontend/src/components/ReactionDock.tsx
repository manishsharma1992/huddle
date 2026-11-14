import { motion } from 'framer-motion';
import { useState } from 'react';
import { t } from '../lib/i18n';
import { focusNth, rovingIndex } from '../lib/roving';
import { sound } from '../lib/sound';

const CHEERS = ['🎉', '👏', '🔥', '🤔', '😂', '🤯', '🚀', '❤️', '☕', '🐢'];

export default function ReactionDock({ onCheer }: { onCheer: (emoji: string) => void }) {
  // One Tab stop for the whole bar; arrows move between reactions.
  const [active, setActive] = useState(0);
  return (
    <div className="reaction-dock" role="toolbar" aria-label={t.reactions} data-roving>
      {CHEERS.map((emoji, i) => (
        <motion.button
          key={emoji}
          className="reaction"
          tabIndex={i === active ? 0 : -1}
          onKeyDown={(e) => {
            const next = rovingIndex(e, i, CHEERS.length);
            if (next === null) return;
            setActive(next);
            focusNth(e, '.reaction', next);
          }}
          whileHover={{ scale: 1.3, y: -4 }}
          whileTap={{ scale: 0.8 }}
          transition={{ type: 'spring', bounce: 0.5, duration: 0.35 }}
          onClick={() => {
            sound.pop();
            onCheer(emoji);
          }}
          aria-label={t.react(emoji)}
          title={emoji === '🐢' ? t.slowTitle : emoji === '☕' ? t.coffeeTitle : undefined}
        >
          {emoji}
        </motion.button>
      ))}
    </div>
  );
}
