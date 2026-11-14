import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { isSizeDeck, pointsFor, pointsLabel } from '../lib/cards';
import { t } from '../lib/i18n';
import type { Seat, Story, Table } from '../lib/types';
import { Button, bouncy, spring } from './ui';

/**
 * What the face-up cards say. On wide screens everything sits on the felt (`part="all"`).
 * On phones the felt keeps only the headline (`"head"`) and the details move below the table (`"body"`),
 * where seats can't cover them.
 */
export default function Results({ table, story, seat, isFacilitator, onError, facilitatorName, part = 'all', onSettle, onCancelSettle, pendingLabel = null }: {
  table: Table;
  story: Story;
  seat: Seat;
  isFacilitator: boolean;
  onError: (e: unknown) => void;
  facilitatorName?: string;
  part?: 'all' | 'head' | 'body';
  onSettle: (storyId: string, label: string) => void;
  onCancelSettle: () => void;
  pendingLabel?: string | null;
}) {
  const result = story.result;
  const people = new Map(table.participants.map((p) => [p.id, p]));
  if (!result) return null;

  const max = Math.max(...Object.values(result.distribution), 1);
  // Deck order, not object-key order (JS puts number-like keys like "1" before "½").
  const rows = table.deck.filter((c) => c.label in result.distribution).map((c) => [c.label, result.distribution[c.label]] as const);
  const settled = story.status === 'ESTIMATED';
  const estimateCards = table.deck.filter((c) => c.label !== '?' && c.label !== '☕');
  const estimates = Object.entries(result.distribution).filter(([label]) => label !== '?' && label !== '☕');
  const top = Math.max(0, ...estimates.map(([, count]) => count));
  const tied = estimates.filter(([, count]) => count === top).map(([label]) => label);
  // A tie has no answer yet. Show the camps side by side and suggest nothing: the team should talk.
  const split = !settled && !result.consensus && tied.length > 1;
  const big = settled ? story.finalEstimate : result.consensus ? Object.keys(result.distribution)[0] : split ? null : result.suggestedEstimate;
  const bigPoints = split ? null : pointsLabel(pointsFor(table.deck, big));
  const eyebrow = settled ? t.lockedIn : result.consensus ? t.consensus : split ? t.split : t.leansToward;

  const head = (
    <div className="results-head">
      <motion.div
        className={`big-estimate ${result.consensus ? 'is-consensus' : ''} ${split ? 'is-split' : ''}`}
        initial={{ scale: 0.3, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ ...bouncy, delay: 0.5 }}
      >
        <span>{split ? tied.join(' · ') : (big ?? '?')}</span>
        {bigPoints && <span className="big-estimate-points">{bigPoints}</span>}
      </motion.div>
      <div className="results-summary">
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="stage-title small clamp-2">{story.title}</h2>
      </div>
    </div>
  );

  const body = (
    <>
      {split && <p className="split-prompt">{t.splitPrompt(tied.join(' · '))}</p>}
      <div className={`distribution ${isSizeDeck(table.deck) ? 'has-sizes' : ''}`}>
        {rows.map(([label, count], i) => {
          const voters = story.votes.filter((v) => v.card === label).map((v) => people.get(v.participantId)).filter(Boolean);
          const points = pointsFor(table.deck, label);
          return (
            <div key={label} className={`dist-row ${label === big || (split && tied.includes(label)) ? 'is-top' : ''}`}>
              <span className="dist-label">
                {label}
                {points !== null && <span className="dist-points">{points}</span>}
              </span>
              <div className="dist-bar-track">
                <motion.div className="dist-bar" initial={{ scaleX: 0 }} animate={{ scaleX: count / max }} transition={{ ...spring, delay: 0.6 + i * 0.06 }} />
              </div>
              <span className="dist-voters">
                {voters.slice(0, 5).map((p, j) => (
                  <motion.span
                    key={p!.id}
                    title={p!.name}
                    className="dist-voter-named"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...bouncy, delay: 0.75 + i * 0.06 + j * 0.03 }}
                  >
                    {p!.avatar}
                    {/* Names, not just animals: nobody should have to remember who's the fox. */}
                    <span className="dist-voter-name">{p!.name.split(/\s+/)[0]}</span>
                  </motion.span>
                ))}
                {voters.length > 5 && <span className="muted small">+{voters.length - 5}</span>}
                {voters.length === 0 && <span className="muted small">{count}</span>}
              </span>
            </div>
          );
        })}
      </div>

      {!settled && isFacilitator && (
        <div className="settle">
          <span className="settle-label" title={t.typeToLock}>
            {t.lockItIn}
            <span className="kbd-hint"> · {t.orType}</span>
          </span>
          <div className="settle-cards">
            {estimateCards.map((card) => {
              const points = pointsFor(table.deck, card.label);
              return (
                <motion.button
                  key={card.label}
                  className={`settle-chip ${card.label === big ? 'is-suggested' : ''} ${card.label === pendingLabel ? 'is-pending' : ''}`}
                  aria-pressed={card.label === pendingLabel}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onSettle(story.id, card.label)}
                  title={pointsLabel(points) ?? undefined}
                >
                  {card.label}
                  {points !== null && <span className="chip-points">{points}</span>}
                </motion.button>
              );
            })}
          </div>
          <Button size="sm" onClick={() => api.revote(seat).catch(onError)}>
            {t.revote}
          </Button>
          {pendingLabel && (
            <div className="settle-pending" role="status">
              <span className="settle-pending-bar" aria-hidden />
              <span>{t.lockingIn(pendingLabel)}</span>
              <button type="button" className="settle-undo" onClick={onCancelSettle}>
                {t.undo} <kbd className="kbd-hint">Esc</kbd>
              </button>
            </div>
          )}
        </div>
      )}
      {!settled && !isFacilitator && !split && (
        <p className="stage-sub">
          {result.consensus ? t.nice : t.talkItThrough}
          {t.willLockIn(facilitatorName ?? t.theFacilitator)}
        </p>
      )}
    </>
  );

  if (part === 'head') return <div className="results">{head}</div>;
  if (part === 'body') return <div className="results results-body">{body}</div>;
  return (
    <div className="results">
      {head}
      {body}
    </div>
  );
}
