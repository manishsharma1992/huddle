import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { isSizeDeck, pointsFor, pointsLabel } from '../lib/cards';
import { copy } from '../lib/encourage';
import { formatNumber, t } from '../lib/i18n';
import type { Participant, Seat, Table } from '../lib/types';
import Results from './Results';
import type { RevealHold } from './TableScreen';
import TimerRing from './TimerRing';
import { Button, bouncy, spring } from './ui';

const TIMERS = [30, 60, 120];

export type Settled = { storyId: string; estimate: string; unanimous: boolean };

export default function CenterStage({
  table,
  seat,
  me,
  isFacilitator,
  hold,
  clockOffset,
  onReveal,
  onError,
  onOpenBacklog,
  onRecap,
  narrow,
  settled,
  onSettle,
  onCancelSettle,
  pendingSettle,
}: {
  table: Table;
  seat: Seat;
  me: Participant;
  isFacilitator: boolean;
  hold: RevealHold;
  clockOffset: number;
  onReveal: () => void;
  onError: (e: unknown) => void;
  onOpenBacklog: () => void;
  onRecap: () => void;
  narrow: boolean;
  settled: Settled | null;
  onSettle: (storyId: string, label: string) => void;
  onCancelSettle: () => void;
  pendingSettle: string | null;
}) {
  const story = table.stories.find((s) => s.id === table.activeStoryId) ?? null;
  const facilitator = table.participants.find((p) => p.facilitator);
  const nextUp = table.stories.find((s) => s.status === 'PENDING');
  const voters = table.participants.filter((p) => p.role === 'VOTER');
  const [waitingLine] = useState(() => copy.waiting(facilitator?.name ?? t.theFacilitator));

  let content: React.ReactNode;
  let key: string;

  const justSettled = !story && settled ? table.stories.find((s) => s.id === settled.storyId) : null;

  if (justSettled && settled) {
    // The decision is the payoff of every round: let it land before the table moves on.
    key = `settled-${settled.storyId}`;
    const points = pointsLabel(pointsFor(table.deck, settled.estimate));
    content = (
      <div className="stage-settled">
        <motion.div
          className={`stamp ${settled.unanimous ? 'is-unanimous' : ''}`}
          initial={{ scale: 1.9, rotate: -16, opacity: 0, y: -30 }}
          animate={{ scale: 1, rotate: -4, opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.45, duration: 0.55 }}
        >
          <span className="stamp-value">{settled.estimate}</span>
          {points && <span className="stamp-points">{points}</span>}
        </motion.div>
        <span className="eyebrow">{t.lockedIn}</span>
        <h2 className="stage-title small clamp-2">{justSettled.title}</h2>
      </div>
    );
  } else if (!story) {
    key = `idle-${nextUp?.id ?? 'none'}-${table.stats.estimatedCount}`;
    const allDone = table.stories.length > 0 && !nextUp;
    content = (
      <div className="stage-idle">
        {allDone ? (
          <>
            <motion.span className="stage-emoji" animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.8, delay: 0.3 }}>
              🏁
            </motion.span>
            <h2 className="stage-title">{t.backlogCleared}</h2>
            <p className="stage-sub">
              {t.clearedStats(table.stats.estimatedCount, formatPoints(table.stats.totalPoints), table.stats.unanimousCount)}
            </p>
            <Button variant="primary" onClick={onRecap}>
              {t.seeRecap}
            </Button>
          </>
        ) : isFacilitator ? (
          nextUp ? (
            <>
              <h2 className="stage-title clamp-2">{nextUp.title}</h2>
              <Button variant="primary" size="lg" title={t.shortcutN} onClick={() => api.startVoting(seat, nextUp.id).catch(onError)}>
                {t.dealCards}
                <kbd className="kbd-hint">N</kbd>
              </Button>
            </>
          ) : (
            <>
              <span className="stage-emoji">👋</span>
              <h2 className="stage-title">{t.welcome(me.name)}</h2>
              <p className="stage-sub">{t.welcomeSub}</p>
              <Button variant="primary" className="show-sm" onClick={onOpenBacklog}>
                {t.addStories}
              </Button>
              <p className="stage-sub hide-sm">{t.useBacklogLeft}</p>
            </>
          )
        ) : (
          <>
            <motion.span className="stage-emoji" animate={{ y: [0, -6, 0] }} transition={{ repeat: 2, duration: 1.2 }}>
              ☕
            </motion.span>
            <h2 className="stage-title">{waitingLine}</h2>
            <p className="stage-sub">{t.warmUp}</p>
          </>
        )}
      </div>
    );
  } else if (story.status === 'VOTING' || (hold && hold.storyId === story.id)) {
    key = `voting-${story.id}-${story.round}`;
    const voted = story.votes.length;
    const everyone = voters.length > 0 && voters.every((v) => story.votes.some((vote) => vote.participantId === v.id));
    content = (
      <div className="stage-voting">
        <h2 className="stage-title clamp-3">{story.title}</h2>
        {(story.round > 1 || table.timerEndsAt) && (
          <div className="stage-meta">
            {story.round > 1 && <span className="stage-round">{t.round(story.round)}</span>}
            {table.timerEndsAt && <TimerRing endsAt={table.timerEndsAt} startedAt={story.roundStartedAt} clockOffset={clockOffset} />}
          </div>
        )}
        <VoteProgress voted={voted} total={voters.length} />
        {hold ? (
          <p className="stage-sub">{t.revealing}</p>
        ) : isFacilitator ? (
          <div className="stage-actions">
            <motion.div animate={everyone ? { scale: [1, 1.05, 1] } : { scale: 1 }} transition={everyone ? { repeat: Infinity, duration: 1.6, repeatDelay: 0.6 } : spring}>
              <Button variant="primary" size="lg" className={everyone ? 'glow' : ''} disabled={voted === 0} onClick={onReveal} title={t.shortcutR}>
                {t.revealCards}
                <kbd className="kbd-hint">R</kbd>
              </Button>
            </motion.div>
            <TimerMenu onStart={(s) => api.timer(seat, s).catch(onError)} />
            <button className="link subtle" onClick={() => api.cancel(seat).catch(onError)}>
              {t.skip}
            </button>
          </div>
        ) : (
          <p className="stage-sub">
            {me.role === 'OBSERVER'
              ? t.watchingRound
              : everyone
                ? t.allIn(facilitator?.name ?? t.theFacilitatorLower)
                : t.pickCard(isSizeDeck(table.deck))}
          </p>
        )}
      </div>
    );
  } else {
    key = `revealed-${story.id}-${story.round}-${story.status}`;
    content = (
      <Results table={table} story={story} seat={seat} isFacilitator={isFacilitator} onError={onError} facilitatorName={facilitator?.name} part={narrow ? 'head' : 'all'} onSettle={onSettle} onCancelSettle={onCancelSettle} pendingLabel={pendingSettle} />
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        className="center-stage"
        initial={{ opacity: 0, y: 12, scale: 0.97, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -12, scale: 0.97, filter: 'blur(6px)' }}
        transition={spring}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}

function VoteProgress({ voted, total }: { voted: number; total: number }) {
  const dots = useMemo(() => Array.from({ length: Math.min(total, 16) }), [total]);
  return (
    <div className="vote-progress" role="group" aria-label={t.votedOf(voted, total)}>
      <div className="pips">
        {dots.map((_, i) => (
          <motion.span key={i} className={`pip ${i < voted ? 'is-on' : ''}`} animate={i < voted ? { scale: [1, 1.5, 1] } : { scale: 1 }} transition={bouncy} />
        ))}
      </div>
      <span className="vote-count">
        <motion.strong key={voted} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={bouncy}>
          {voted}
        </motion.strong>
        /{total} {t.voted}
      </span>
    </div>
  );
}

function TimerMenu({ onStart }: { onStart: (seconds: number) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <div className="timer-menu">
      <AnimatePresence mode="popLayout" initial={false}>
        {open ? (
          <motion.div key="opts" className="timer-opts" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring}>
            {TIMERS.map((s) => (
              <button
                key={s}
                className="mini-pill"
                onClick={() => {
                  onStart(s);
                  setOpen(false);
                }}
              >
                {s < 60 ? `${s}s` : `${s / 60}m`}
              </button>
            ))}
            <button className="mini-pill" onClick={() => setOpen(false)} aria-label={t.closeTimer}>
              ✕
            </button>
          </motion.div>
        ) : (
          <motion.button key="btn" className="mini-pill" onClick={() => setOpen(true)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} title={t.startTimer}>
            {t.timer}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export function formatPoints(points: number) {
  return formatNumber(points);
}
