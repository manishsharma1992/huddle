import { AnimatePresence, motion } from 'framer-motion';
import { forwardRef, type MutableRefObject, type ReactNode } from 'react';
import { PHONE, useMedia } from '../lib/useMedia';
import type { Seat as SeatAuth, Table } from '../lib/types';
import type { RevealHold } from './TableScreen';
import Seat from './Seat';

type Props = {
  table: Table;
  meId: string;
  online: Set<string>;
  hold: RevealHold;
  justFlipped: string | null;
  myVote: string | null;
  seatRefs: MutableRefObject<Map<string, HTMLElement>>;
  isFacilitator: boolean;
  seat: SeatAuth;
  onThrow: (targetId: string, emoji: string) => void;
  onEditProfile: () => void;
  onError: (e: unknown) => void;
  children: ReactNode;
  caption?: { text: string; id: number } | null;
};

/** The felt table, with everyone seated around it and you at the near edge. */
const PokerTable = forwardRef<HTMLDivElement, Props>(function PokerTable(
  { table, meId, online, hold, justFlipped, myVote, seatRefs, isFacilitator, seat, onThrow, onEditProfile, onError, children, caption },
  ref,
) {
  const story = table.stories.find((s) => s.id === table.activeStoryId) ?? null;
  const meIndex = table.participants.findIndex((p) => p.id === meId);
  const ordered = [...table.participants.slice(meIndex), ...table.participants.slice(0, meIndex)];
  const n = ordered.length;
  const crowded = n > 10;
  // On a phone, cards on the felt fight the content: with more than 6 people always, and once results are
  // showing for any table size. Votes then ride on the avatars as badges.
  const phone = useMedia(PHONE);
  const packed = phone && (n > 6 || (!!story && story.status !== 'VOTING'));
  const result = story?.result ?? null;

  // Order in which cards flip: the order people voted in, for a satisfying ripple.
  const flipOrder = new Map(story?.votes.map((v, i) => [v.participantId, i]) ?? []);

  return (
    <div className={`poker-table-wrap ${crowded ? 'is-crowded' : ''} ${packed ? 'is-packed' : ''}`} style={{ ['--seat-count' as string]: n }}>
      <div className="poker-table" ref={ref}>
        <div className="felt">
          <div className="felt-inner">{children}</div>
          <AnimatePresence>
            {caption && (
              <motion.p
                key={caption.id}
                className="felt-caption"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {caption.text}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        {ordered.map((participant, i) => {
          const angle = Math.PI / 2 + (i * 2 * Math.PI) / n;
          const x = 50 + 50 * Math.cos(angle);
          const y = 50 + 50 * Math.sin(angle);
          const vote = story?.votes.find((v) => v.participantId === participant.id) ?? null;
          const faceUp = !!story && story.status !== 'VOTING' && !(hold && hold.storyId === story.id);
          return (
            <Seat
              key={participant.id}
              participant={participant}
              isMe={participant.id === meId}
              online={online.has(participant.id)}
              x={x}
              y={y}
              towardCenter={{ x: -Math.cos(angle), y: -Math.sin(angle) }}
              story={story}
              deck={table.deck}
              packed={packed}
              vote={vote}
              myVote={participant.id === meId ? myVote : null}
              faceUp={faceUp}
              flipDelay={justFlipped === story?.id ? (flipOrder.get(participant.id) ?? 0) * 0.08 : 0}
              outlier={!!result && faceUp && result.outliers.includes(participant.id)}
              registerRef={(el) => {
                if (el) seatRefs.current.set(participant.id, el);
                else seatRefs.current.delete(participant.id);
              }}
              isFacilitator={isFacilitator}
              seat={seat}
              onThrow={onThrow}
              onEditProfile={onEditProfile}
              onError={onError}
            />
          );
        })}
      </div>
    </div>
  );
});

export default PokerTable;
