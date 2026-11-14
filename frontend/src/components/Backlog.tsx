import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useMedia } from '../lib/useMedia';
import { api } from '../lib/api';
import { pointsFor } from '../lib/cards';
import { formatNumber, t } from '../lib/i18n';
import type { Card, Seat, Story, Table } from '../lib/types';
import { Button, spring } from './ui';

const STATUS_LABEL: Record<Story['status'], string> = t.status;

export default function Backlog({
  table,
  seat,
  isFacilitator,
  open,
  onClose,
  onError,
  onRemove,
  freshId,
}: {
  table: Table;
  seat: Seat;
  isFacilitator: boolean;
  open: boolean;
  onClose: () => void;
  onError: (e: unknown) => void;
  onRemove: (story: Story) => void;
  freshId: string | null;
}) {
  const [draft, setDraft] = useState('');
  // Below 980px the backlog is a drawer over the table: a modal dialog that takes focus while open.
  const drawer = useMedia('(max-width: 980px)');
  const asideRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!drawer || !open) return;
    const opener = document.activeElement as HTMLElement | null;
    // Land in the add-story box (facilitators); otherwise on the first control.
    const id = requestAnimationFrame(() =>
      (asideRef.current?.querySelector<HTMLElement>('textarea') ?? asideRef.current?.querySelector<HTMLElement>('button'))?.focus(),
    );
    return () => {
      cancelAnimationFrame(id);
      opener?.focus?.();
    };
  }, [drawer, open]);

  // The drawer (narrow screens) closes with Escape like any other overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  const [adding, setAdding] = useState(false);

  const inPlay = table.stories.filter((s) => s.status === 'VOTING' || s.status === 'REVEALED');
  const upNext = table.stories.filter((s) => s.status === 'PENDING');
  const done = table.stories.filter((s) => s.status === 'ESTIMATED');
  const progress = table.stories.length ? done.length / table.stories.length : 0;

  async function add(e?: React.FormEvent) {
    e?.preventDefault();
    if (!draft.trim()) return;
    setAdding(true);
    try {
      await api.addStories(seat, [draft]);
      setDraft('');
    } catch (err) {
      onError(err);
    } finally {
      setAdding(false);
    }
  }

  const play = (story: Story) => {
    api.startVoting(seat, story.id).catch(onError);
    onClose();
  };

  return (
    <>
      <AnimatePresence>{open && <motion.div className="drawer-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />}</AnimatePresence>
      <aside
        ref={asideRef}
        className={`backlog ${open ? 'is-open' : ''}`}
        aria-label={t.backlog}
        role={drawer && open ? 'dialog' : undefined}
        aria-modal={drawer && open ? true : undefined}
        aria-hidden={drawer && !open ? true : undefined}
      >
        <div className="backlog-head">
          <h2>{t.backlog}</h2>
          <span className="muted small">
            {t.estimatedOf(done.length, table.stories.length)}
          </span>
          {drawer && (
            <button className="icon-btn drawer-close" onClick={onClose} aria-label={t.close}>
              ✕
            </button>
          )}
        </div>
        <div className="progress" aria-hidden>
          <motion.div className="progress-fill" animate={{ scaleX: progress }} transition={spring} />
        </div>

        {isFacilitator && (
          <form className="add-story" onSubmit={add}>
            <textarea
              className="input"
              rows={2}
              value={draft}
              placeholder={t.addStoryPlaceholder}
              aria-label={t.addStoryLabel}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void add();
                }
              }}
            />
            <Button variant="primary" size="sm" type="submit" disabled={!draft.trim() || adding}>
              {draft.split('\n').filter((l) => l.trim()).length > 1 ? t.addN(draft.split('\n').filter((l) => l.trim()).length) : t.add}
            </Button>
          </form>
        )}

        <div className="backlog-scroll">
          {table.stories.length === 0 && (
            <div className="empty">
              <span className="empty-emoji">📋</span>
              <p>{isFacilitator ? t.emptyFacilitator : t.emptyGuest}</p>
            </div>
          )}
          <Group title={t.inPlay} deck={table.deck} stories={inPlay} isFacilitator={isFacilitator} onPlay={play} onRemove={onRemove} freshId={freshId} />
          <Group title={t.upNext} deck={table.deck} stories={upNext} isFacilitator={isFacilitator} onPlay={play} onRemove={onRemove} freshId={freshId} />
          <Group title={t.done} deck={table.deck} stories={done} isFacilitator={isFacilitator} onPlay={play} onRemove={onRemove} freshId={freshId} />
        </div>

        {done.length > 0 && (
          <footer className="backlog-foot">
            <span>{t.total}</span>
            <strong>
              {formatNumber(table.stats.totalPoints)} {t.ptsSuffix}
            </strong>
          </footer>
        )}
      </aside>
    </>
  );
}

function Group({ title, deck, stories, isFacilitator, onPlay, onRemove, freshId }: {
  title: string;
  deck: Card[];
  stories: Story[];
  isFacilitator: boolean;
  onPlay: (story: Story) => void;
  onRemove: (story: Story) => void;
  freshId: string | null;
}) {
  if (stories.length === 0) return null;
  return (
    <section className="story-group">
      <h3>{title}</h3>
      <ul>
        <AnimatePresence initial={false}>
          {stories.map((story) => (
            <motion.li
              key={story.id}
              layout
              layoutId={`story-${story.id}`}
              className={`story story-${story.status.toLowerCase()} ${story.id === freshId ? 'is-fresh' : ''}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={spring}
            >
              <div className="story-main">
                <span className="story-title" title={story.title}>
                  {story.title}
                </span>
                <span className="story-meta">
                  {STATUS_LABEL[story.status]}
                  {story.round > 1 && story.status !== 'PENDING' ? ` · ${t.rounds(story.round)}` : ''}
                  {story.unanimous && ` · ${t.unanimousTag}`}
                </span>
              </div>
              {story.finalEstimate && <EstimateBadge deck={deck} label={story.finalEstimate} />}
              {isFacilitator && (
                <div className="story-actions">
                  {story.status !== 'VOTING' && story.status !== 'REVEALED' && (
                    <button className="mini-btn play" onClick={() => onPlay(story)} title={story.status === 'ESTIMATED' ? t.estimateAgain : t.startVoting}
                      aria-label={`${story.status === 'ESTIMATED' ? t.estimateAgain : t.startVoting}: ${story.title}`}>
                      {story.status === 'ESTIMATED' ? '↻' : '▶'}
                    </button>
                  )}
                  <button className="mini-btn remove" onClick={() => onRemove(story)} title={t.remove} aria-label={`${t.remove}: ${story.title}`}>
                    ✕
                  </button>
                </div>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

/** A settled estimate. Size cards also show their points, so "M" reads as "M 3". */
export function EstimateBadge({ deck, label }: { deck: Card[]; label: string }) {
  const points = pointsFor(deck, label);
  return (
    <span className="estimate-badge">
      {label}
      {points !== null && <span className="chip-points">{points}</span>}
    </span>
  );
}
