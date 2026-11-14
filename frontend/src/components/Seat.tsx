import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { pointsFor } from '../lib/cards';
import { t } from '../lib/i18n';
import { hueFor } from '../lib/identity';
import type { Card, Participant, Seat as SeatAuth, Story, Vote } from '../lib/types';
import { PlayingCard } from './PlayingCard';
import { bouncy, spring } from './ui';

export const THROWABLES = ['✈️', '🌸', '⭐', '🍅', '☕', '🎯'];

type Props = {
  participant: Participant;
  isMe: boolean;
  online: boolean;
  x: number;
  y: number;
  towardCenter: { x: number; y: number };
  story: Story | null;
  deck: Card[];
  packed: boolean;
  vote: Vote | null;
  myVote: string | null;
  faceUp: boolean;
  flipDelay: number;
  outlier: boolean;
  registerRef: (el: HTMLElement | null) => void;
  isFacilitator: boolean;
  seat: SeatAuth;
  onThrow: (targetId: string, emoji: string) => void;
  onEditProfile: () => void;
  onError: (e: unknown) => void;
};

export default function Seat(props: Props) {
  const { participant, isMe, online, x, y, towardCenter, story, vote, myVote, faceUp, flipDelay, outlier } = props;
  const [menu, setMenu] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const avatarRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const wobble = useAnimationControls();
  const ref = useRef<HTMLDivElement | null>(null);
  const tilt = useRef((Math.random() - 0.5) * 14);

  useEffect(() => {
    const onHit = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== participant.id) return;
      void wobble.start({ rotate: [0, -14, 10, -6, 3, 0], scale: [1, 0.86, 1.08, 1], transition: { duration: 0.55 } });
    };
    window.addEventListener('huddle:hit', onHit);
    return () => window.removeEventListener('huddle:hit', onHit);
  }, [participant.id, wobble]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
        avatarRef.current?.focus();
      }
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKey);
      setConfirmRemove(false);
    };
  }, [menu]);

  const voting = story?.status === 'VOTING';
  const isVoter = participant.role === 'VOTER';
  const hasVoted = !!vote || (isMe && !!myVote && voting);
  const hue = hueFor(participant.id);
  const seatStatus =
    faceUp && vote?.card ? t.played(vote.card) : voting && isVoter ? (hasVoted ? t.hasVoted : t.stillThinking) : participant.role === 'OBSERVER' ? t.watching : t.waitingRound;
  const shownCard = vote?.card ?? myVote;

  return (
    <div
      ref={(el) => {
        ref.current = el;
        props.registerRef(el);
      }}
      className={`seat ${y < 30 ? 'is-top' : ''} ${isMe ? 'is-me' : ''} ${online ? '' : 'is-away'} ${outlier ? 'is-outlier' : ''}`}
      style={{ left: `${x}%`, top: `${y}%`, ['--hue' as string]: hue }}
    >
      {/* card slot, pushed toward the middle of the table (not on a packed phone table: see the vote badge) */}
      {!props.packed && <div className="seat-card" style={{ transform: `translate(calc(-50% + ${towardCenter.x} * var(--card-offset)), calc(-50% + ${towardCenter.y} * var(--card-offset)))` }}>
        <AnimatePresence mode="popLayout">
          {story && isVoter && hasVoted && (
            <motion.div
              key={`card-${story.id}-${story.round}`}
              initial={{ opacity: 0, scale: 0.4, x: -towardCenter.x * 40, y: -towardCenter.y * 40, rotate: tilt.current * 3 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: tilt.current }}
              exit={{ opacity: 0, scale: 0.6, y: 20 }}
              transition={bouncy}
            >
              <PlayingCard label={vote?.card ?? myVote} points={pointsFor(props.deck, vote?.card ?? myVote)} faceUp={faceUp && !!vote?.card} size="sm" delay={flipDelay} highlight={outlier} />
              {isMe && voting && myVote && <span className="my-mark">{myVote}</span>}
            </motion.div>
          )}
          {story && voting && isVoter && !hasVoted && (
            <motion.div key="thinking" className="card-placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <span className="thinking">
                <i />
                <i />
                <i />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>}

      <motion.button
        ref={avatarRef}
        className="seat-avatar"
        animate={wobble}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        transition={bouncy}
        onClick={() => (isMe ? props.onEditProfile() : setMenu((m) => !m))}
        aria-label={isMe ? t.editProfile : t.seatStatus(participant.name, seatStatus)}
        aria-haspopup={isMe ? undefined : 'dialog'}
        aria-expanded={isMe ? undefined : menu}
      >
        <span className="seat-emoji">{participant.avatar}</span>
        {participant.facilitator && <span className="badge badge-crown" title={t.facilitator}>👑</span>}
        {!online && <span className="badge badge-away" title={t.away}>💤</span>}
        <AnimatePresence>
          {props.packed && story && isVoter && (hasVoted || voting) && (
            <motion.span
              key={faceUp && vote?.card ? `face-${vote.card}` : hasVoted ? 'in' : 'thinking'}
              className={`badge vote-badge ${faceUp && vote?.card ? 'is-face' : hasVoted ? 'is-in' : 'is-thinking'} ${outlier ? 'is-outlier' : ''}`}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ ...bouncy, delay: faceUp ? flipDelay : 0 }}
              aria-hidden
            >
              {faceUp && vote?.card ? vote.card : hasVoted ? (isMe && shownCard ? shownCard : '✓') : '…'}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <span className="seat-name">
        {isMe ? t.you : participant.name}
        {participant.role === 'OBSERVER' && <span className="seat-role"> · 👀</span>}
      </span>

      <AnimatePresence>
        {/* A private nudge: only the outlier is invited to speak; everyone else just sees the gold ring. */}
        {outlier && isMe && (
          <motion.span className="outlier-bubble" initial={{ opacity: 0, y: 6, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ ...bouncy, delay: 1.1 }}>
            {t.shareThinking}
          </motion.span>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menu && (
          <motion.div
            className="seat-menu"
            initial={{ opacity: 0, scale: 0.85, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 6 }}
            transition={spring}
            role="dialog"
            aria-label={t.throwAt(participant.name)}
            ref={menuRef}
          >
            <span className="seat-menu-title">{t.throwAt(participant.name)}</span>
            <div className="throw-row">
              {THROWABLES.map((emoji) => (
                <motion.button
                  key={emoji}
                  className="throw-btn"
                  whileHover={{ scale: 1.25, rotate: -10 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => props.onThrow(participant.id, emoji)}
                  aria-label={t.throwEmoji(emoji)}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
            {props.isFacilitator && (
              <div className="seat-menu-actions" role="group" aria-label={t.facilitatorActions}>
                <span className="seat-menu-title">{t.facilitatorActions}</span>
                <button
                  onClick={() => {
                    api.handOver(props.seat, participant.id).catch(props.onError);
                    setMenu(false);
                  }}
                >
                  {t.makeFacilitator}
                </button>
                <button
                  className={`danger ${confirmRemove ? 'is-confirming' : ''}`}
                  onClick={() => {
                    // Two steps: removing someone mid-session is hard to take back.
                    if (!confirmRemove) {
                      setConfirmRemove(true);
                      return;
                    }
                    api.dismiss(props.seat, participant.id).catch(props.onError);
                    setMenu(false);
                  }}
                >
                  {confirmRemove ? t.confirmRemove(participant.name) : t.removeFromTable}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
