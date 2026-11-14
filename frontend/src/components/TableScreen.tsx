import confetti from 'canvas-confetti';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Prefs } from '../App';
import { api } from '../lib/api';
import { pointsFor, pointsLabel, typedKeys } from '../lib/cards';
import { copy } from '../lib/encourage';
import { t } from '../lib/i18n';
import { sound } from '../lib/sound';
import type { Seat, Story, Table, TableEvent } from '../lib/types';
import { PHONE, useMedia } from '../lib/useMedia';
import { useTable } from '../lib/useTable';
import Backlog from './Backlog';
import CenterStage, { type Settled } from './CenterStage';
import EffectsLayer, { type EffectsHandle } from './EffectsLayer';
import Hand from './Hand';
import PokerTable from './PokerTable';
import ProfileSheet from './ProfileSheet';
import Recap from './Recap';
import ReactionDock from './ReactionDock';
import Results from './Results';
import Toasts, { ACTION_TOAST_MS, useToasts } from './Toasts';
import TopBar from './TopBar';
import InviteSheet from './InviteSheet';
import Tour, { buildSteps } from './Tour';
import { type Account, accounts, displayName } from '../lib/account';
import { Sheet } from './ui';

const CONFETTI_COLORS = ['#0b8457', '#33c08a', '#f5b83d', '#ff7a5c', '#7c6cff', '#3aa0ff'];

export type RevealHold = { storyId: string; count: number } | null;

export default function TableScreen({
  seat,
  account,
  prefs,
  setPrefs,
  onExit,
  onLostSeat,
}: {
  seat: Seat;
  account: Account;
  prefs: Prefs;
  setPrefs: (p: Prefs) => void;
  onExit: () => void;
  onLostSeat: () => void;
}) {
  const { table, online, myVote, setMyVote, connected, clockOffset, listeners } = useTable(seat, onLostSeat);
  const { toasts, toast, dismiss } = useToasts();
  const reduceMotion = useReducedMotion();
  const effects = useRef<EffectsHandle>(null);
  const seatRefs = useRef(new Map<string, HTMLElement>());
  const tableRef = useRef<HTMLDivElement>(null);
  const [hold, setHold] = useState<RevealHold>(null);
  const [streak, setStreak] = useState(0);
  const [backlogOpen, setBacklogOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [justFlipped, setJustFlipped] = useState<string | null>(null);
  const [settled, setSettled] = useState<Settled | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [hiddenStories, setHiddenStories] = useState<Set<string>>(() => new Set());
  const [countdownAt, setCountdownAt] = useState<{ x: number; y: number } | null>(null);
  const narrow = useMedia(PHONE);
  const tableState = useRef<Table | null>(null);
  tableState.current = table;

  const me = table?.participants.find((p) => p.id === seat.participantId) ?? null;

  // The first time you sit at any table, walk through how a round works (once per person on this computer).
  const meId = me?.id;
  useEffect(() => {
    if (!meId || accounts.tourSeen(account.email, 'table')) return;
    const id = window.setTimeout(() => setTouring(true), 900);
    return () => window.clearTimeout(id);
  }, [meId, account.email]);

  // Seats keep the name you had when you sat down; after changing your details, catch the seat up.
  const wantedName = displayName(account);
  const staleName = !!me && me.name !== wantedName;
  useEffect(() => {
    if (!staleName || !me) return;
    api.updateProfile(seat, { name: wantedName, avatar: me.avatar, role: me.role }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staleName, wantedName]);
  const isFacilitator = !!me?.facilitator;
  const activeStory = table?.stories.find((s) => s.id === table.activeStoryId) ?? null;

  const isFacilitatorRef = useRef(isFacilitator);
  isFacilitatorRef.current = isFacilitator;

  const fail = useCallback((err: unknown) => toast((err as Error).message, 'error'), [toast]);

  // Flavour toasts wait while a drawer or panel is open: they'd cover what the person is working in.
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [touring, setTouring] = useState(false);
  const quiet = useRef(false);
  quiet.current = backlogOpen || recapOpen || profileOpen || inviteOpen || shortcutsOpen || touring;
  const notify = useCallback((text: string, tone: 'info' | 'success' | 'celebrate' = 'info') => {
    if (!quiet.current) toast(text, tone);
  }, [toast]);

  // The cheerful lines stay special: one per round stage, only the big moments after the first few stories,
  // and on phones a caption on the felt instead of a toast over the top bar.
  const [caption, setCaption] = useState<{ text: string; id: number } | null>(null);
  const narrowRef = useRef(narrow);
  narrowRef.current = narrow;
  const estimatedSoFar = useRef(0);
  estimatedSoFar.current = table?.stats.estimatedCount ?? 0;
  const lastStage = useRef('');
  const flavour = useCallback(
    (text: string, tone: 'info' | 'success' | 'celebrate', stage: string, essential = false) => {
      if (quiet.current || lastStage.current === stage) return;
      if (!essential && estimatedSoFar.current >= 3) return;
      lastStage.current = stage;
      if (!narrowRef.current) {
        toast(text, tone);
        return;
      }
      const id = Date.now();
      setCaption({ text, id });
      setTimeout(() => setCaption((c) => (c?.id === id ? null : c)), 3400);
    },
    [toast],
  );

  // Several people arriving together become one toast, not a stack.
  const joins = useRef<{ names: string[]; timer: ReturnType<typeof setTimeout> | null }>({ names: [], timer: null });
  const announceJoin = useCallback(
    (who: string, returning: boolean) => {
      const j = joins.current;
      j.names.push(who);
      if (j.timer) clearTimeout(j.timer);
      j.timer = setTimeout(() => {
        notify(j.names.length > 1 ? t.peopleJoined(j.names.length) : t.joinedTable(j.names[0], returning), 'info');
        j.names = [];
        j.timer = null;
      }, 900);
    },
    [notify],
  );

  // Locking in waits out an Undo window, like removing a story.
  const [pendingSettle, setPendingSettle] = useState<{ storyId: string; label: string } | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settle = useCallback(
    (storyId: string, label: string) => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      setPendingSettle({ storyId, label });
      settleTimer.current = setTimeout(() => {
        settleTimer.current = null;
        api.settle(seat, storyId, label).catch(fail).finally(() => setPendingSettle(null));
      }, ACTION_TOAST_MS);
      // The Undo lives in the lock-in row itself (see Results), right where the choice was made.
      setAnnouncement(t.lockingIn(label));
    },
    [seat, fail],
  );
  const cancelSettle = useCallback(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = null;
    setPendingSettle(null);
  }, []);

  const celebrate = useCallback(
    (big: boolean) => {
      if (reduceMotion) return;
      const rect = tableRef.current?.getBoundingClientRect();
      const origin = rect
        ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight }
        : { x: 0.5, y: 0.5 };
      confetti({ particleCount: big ? 140 : 50, spread: big ? 100 : 60, startVelocity: big ? 42 : 28, origin, colors: CONFETTI_COLORS, scalar: 0.9, ticks: 220, disableForReducedMotion: true });
      if (big) {
        setTimeout(() => {
          confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: 0.75 }, colors: CONFETTI_COLORS, disableForReducedMotion: true });
          confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: 0.75 }, colors: CONFETTI_COLORS, disableForReducedMotion: true });
        }, 220);
      }
    },
    [reduceMotion],
  );

  // ------------------------------------------------------------ react to what happened at the table
  const nameOf = useCallback((id: unknown) => {
    const p = tableState.current?.participants.find((x) => x.id === id);
    return p ? `${p.avatar} ${p.name}` : t.someone;
  }, []);

  const finishReveal = useCallback(
    (storyId: string, consensus: boolean, voteCount: number) => {
      setHold(null);
      setJustFlipped(storyId);
      const revealed = tableState.current?.stories.find((s) => s.id === storyId);
      if (revealed) setAnnouncement(revealSummary(revealed, tableState.current!));
      for (let i = 0; i < Math.min(voteCount, 10); i++) sound.flip(i);
      setTimeout(() => {
        if (consensus) {
          sound.chime();
          celebrate(true);
          flavour(copy.consensus(), 'celebrate', `${storyId}-reveal`, true);
        } else {
          sound.soft();
          flavour(copy.spread(), 'info', `${storyId}-reveal`);
        }
      }, 450 + voteCount * 60);
    },
    [celebrate, flavour],
  );

  const onEvents = useCallback(
    (events: TableEvent[], next: Table) => {
      for (const event of events) {
        const mine = event.participantId === seat.participantId;
        switch (event.type) {
          case 'VotingStarted':
            sound.whoosh();
            if ((event.round as number) > 1) flavour(t.roundN(event.round as number), 'info', `${next.activeStoryId}-${event.round}-start`, true);
            else flavour(copy.roundStart(), 'info', `${next.activeStoryId}-1-start`);
            setJustFlipped(null);
            break;
          case 'VoteCast':
            if (!mine) sound.place();
            if (event.firstOfRound && !mine) flavour(copy.firstVote(nameOf(event.participantId)), 'info', `${next.activeStoryId}-${next.stories.find((s) => s.id === next.activeStoryId)?.round}-start`);
            if (event.everyoneVoted) flavour(copy.everyoneIn(), 'success', `${next.activeStoryId}-${next.stories.find((s) => s.id === next.activeStoryId)?.round}-full`, true);
            break;
          case 'CardsRevealed': {
            const story = next.stories.find((s) => s.id === event.storyId);
            const voteCount = story?.votes.length ?? 0;
            const consensus = !!event.consensus;
            if (reduceMotion) {
              finishReveal(event.storyId as string, consensus, voteCount);
              break;
            }
            let count = 3;
            const rect = tableRef.current?.getBoundingClientRect();
            setCountdownAt(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);
            setHold({ storyId: event.storyId as string, count });
            sound.count(count);
            const timer = setInterval(() => {
              count -= 1;
              if (count === 0) {
                clearInterval(timer);
                finishReveal(event.storyId as string, consensus, voteCount);
              } else {
                setHold({ storyId: event.storyId as string, count });
                sound.count(count);
              }
            }, 420);
            break;
          }
          case 'StoryEstimated': {
            const estimate = event.estimate as string;
            const points = pointsLabel(pointsFor(next.deck, estimate));
            const storyId = event.storyId as string;
            setSettled({ storyId, estimate, unanimous: !!event.unanimous });
            setTimeout(() => setSettled((s) => (s?.storyId === storyId ? null : s)), 2800);
            setAnnouncement(copy.estimated(points ? `${estimate} (${points})` : estimate));
            setStreak((s) => (event.unanimous ? s + 1 : 0));
            if (event.unanimous) celebrate(false);
            else sound.soft();
            break;
          }
          case 'ParticipantJoined': {
            const recentlySeated = next.participants.find((p) => p.id === event.participantId);
            const fresh = recentlySeated && Date.now() - recentlySeated.joinedAt < 8000;
            if (!mine && (!event.returning || !fresh)) {
              sound.pop();
              announceJoin(`${event.avatar} ${event.name}`, !!event.returning);
            }
            break;
          }
          case 'ParticipantLeft':
            if (!mine) notify(t.leftTable(event.name as string), 'info');
            break;
          case 'FacilitatorChanged':
            if (mine) notify(t.youFacilitate, 'celebrate');
            else notify(t.nowFacilitating(nameOf(event.participantId)), 'info');
            break;
          case 'TimerStarted':
            sound.tick();
            notify(t.timerStarted, 'info');
            break;
          case 'StoriesAdded':
            if (!isFacilitatorRef.current) notify(t.storiesAdded(event.count as number), 'info');
            break;
        }
      }
    },
    [seat.participantId, notify, flavour, nameOf, reduceMotion, finishReveal, celebrate, announceJoin],
  );

  useEffect(() => {
    listeners.current.events = onEvents;
    listeners.current.effect = (effect) => {
      if (effect.fromId === seat.participantId) return; // already played locally
      if (effect.kind === 'throw' && effect.targetId) effects.current?.throwAt(effect.fromId, effect.targetId, effect.emoji);
      else effects.current?.cheer(effect.fromId, effect.emoji);
    };
  }, [listeners, onEvents, seat.participantId]);

  // ------------------------------------------------------------ actions
  const vote = useCallback(
    (label: string) => {
      if (!table || !activeStory || activeStory.status !== 'VOTING' || me?.role !== 'VOTER') return;
      if (myVote === label) {
        setMyVote(null);
        sound.tap();
        api.retract(seat).catch((e) => {
          setMyVote(label);
          fail(e);
        });
        return;
      }
      const previous = myVote;
      setMyVote(label);
      sound.place();
      api.vote(seat, label).catch((e) => {
        setMyVote(previous);
        fail(e);
      });
    },
    [table, activeStory, me, myVote, setMyVote, seat, fail],
  );

  const cheer = useCallback(
    (emoji: string) => {
      effects.current?.cheer(seat.participantId, emoji);
      api.effect(seat, 'cheer', emoji).catch(() => undefined);
    },
    [seat],
  );

  const throwAt = useCallback(
    (targetId: string, emoji: string) => {
      effects.current?.throwAt(seat.participantId, targetId, emoji);
      api.effect(seat, 'throw', emoji, targetId).catch(() => undefined);
    },
    [seat],
  );

  const reveal = useCallback(() => {
    api.reveal(seat).catch(fail);
  }, [seat, fail]);

  // Removing a story waits out an Undo window before it reaches the server.
  const removeStory = useCallback(
    (story: Story) => {
      setHiddenStories((s) => new Set(s).add(story.id));
      const show = () =>
        setHiddenStories((s) => {
          const copy = new Set(s);
          copy.delete(story.id);
          return copy;
        });
      const commit = setTimeout(() => {
        api.removeStory(seat, story.id).catch(fail).finally(show);
      }, ACTION_TOAST_MS + 200);
      toast(t.storyRemoved(story.title), 'info', {
        label: t.undo,
        run: () => {
          clearTimeout(commit);
          show();
        },
      });
    },
    [seat, fail, toast],
  );

  // ------------------------------------------------------------ keyboard: type a card, R to reveal, Esc to take back
  const buffer = useRef({ text: '', at: 0 });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!table) return;
      // Menus, panels and the backlog drawer own their keys.
      if (target.closest('[role="dialog"], .backlog.is-open, .seat-menu')) return;
      // H always opens help; ? does too, except while you can vote, when it plays the "?" card.
      const canVote = activeStory?.status === 'VOTING' && me?.role === 'VOTER';
      if (e.key === 'h' || e.key === 'H' || (e.key === '?' && !canVote)) {
        setShortcutsOpen(true);
        return;
      }
      // N deals the next story (facilitator, nothing in play)
      if ((e.key === 'n' || e.key === 'N') && isFacilitator && !activeStory) {
        const nextUp = table.stories.find((s) => s.status === 'PENDING' && !hiddenStories.has(s.id));
        if (nextUp) api.startVoting(seat, nextUp.id).catch(fail);
        return;
      }
      if (!activeStory) return;
      if (e.key === 'Escape' && pendingSettle) {
        cancelSettle();
        return;
      }
      if (e.key === 'Escape' && myVote && activeStory.status === 'VOTING') {
        vote(myVote);
        return;
      }
      if ((e.key === 'r' || e.key === 'R') && isFacilitator && activeStory.status === 'VOTING' && activeStory.votes.length > 0) {
        reveal();
        return;
      }
      if (!activeStory) return;
      const now = Date.now();
      const key = e.key === 'c' || e.key === 'C' ? '☕' : e.key.toUpperCase();
      const text = now - buffer.current.at < 600 ? buffer.current.text + key : key;
      buffer.current = { text, at: now };
      // Size cards answer to their points too, so "3" plays M.
      // While voting, typing plays a card. Once revealed, the facilitator types a card to lock it in.
      const settling = activeStory.status === 'REVEALED' && isFacilitator;
      if (activeStory.status !== 'VOTING' && !settling) return;
      const playable = settling ? table.deck.filter((c) => c.label !== '?' && c.label !== '☕') : table.deck;
      const act = (label: string) => (settling ? settle(activeStory.id, label) : vote(label));
      const exact = playable.find((c) => typedKeys(c).includes(text));
      const longer = playable.some((c) => typedKeys(c).some((k) => k.startsWith(text) && k !== text));
      if (exact && !longer) act(exact.label);
      else if (exact) {
        setTimeout(() => {
          if (buffer.current.text === text) act(exact.label);
        }, 420);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [table, activeStory, myVote, isFacilitator, vote, reveal, seat, fail, hiddenStories, settle, pendingSettle, cancelSettle, me]);

  const facilitatorMissing = useMemo(
    () => !!table && !!me && !table.participants.some((p) => p.facilitator),
    [table, me],
  );

  if (!table || !me) {
    return (
      <div className="center-screen">
        <motion.div className="loader" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
      </div>
    );
  }

  const votingOpen = activeStory?.status === 'VOTING';
  const showResultsBelow = narrow && !!activeStory && activeStory.status === 'REVEALED' && !hold && !!activeStory.result;
  const visibleTable = hiddenStories.size ? { ...table, stories: table.stories.filter((s) => !hiddenStories.has(s.id)) } : table;

  return (
    <div className="table-screen">
      <TopBar
        table={table}
        online={online}
        connected={connected}
        prefs={prefs}
        setPrefs={setPrefs}
        streak={streak}
        onInvite={() => setInviteOpen(true)}
        onRecap={() => setRecapOpen(true)}
        onProfile={() => setProfileOpen(true)}
        onBacklog={() => setBacklogOpen((o) => !o)}
        onShortcuts={() => setShortcutsOpen(true)}
        onExit={onExit}
        me={me}
      />

      <div className="table-layout">
        <Backlog
          table={visibleTable}
          seat={seat}
          isFacilitator={isFacilitator}
          open={backlogOpen}
          onClose={() => setBacklogOpen(false)}
          onError={fail}
          onRemove={removeStory}
          freshId={settled?.storyId ?? null}
        />

        <main className="stage">
          {facilitatorMissing && (
            <motion.div className="banner" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              {t.nobodyFacilitating}
              <button className="link" onClick={() => api.stepUp(seat).catch(fail)}>
                {t.stepUp}
              </button>
            </motion.div>
          )}
          <PokerTable
            ref={tableRef}
            table={table}
            meId={me.id}
            online={online}
            hold={hold}
            justFlipped={justFlipped}
            myVote={myVote}
            seatRefs={seatRefs}
            isFacilitator={isFacilitator}
            seat={seat}
            onThrow={throwAt}
            onEditProfile={() => setProfileOpen(true)}
            onError={fail}
            caption={caption}
          >
            <CenterStage
              table={visibleTable}
              narrow={narrow}
              settled={settled}
              onSettle={settle}
              onCancelSettle={cancelSettle}
              pendingSettle={pendingSettle && pendingSettle.storyId === activeStory?.id ? pendingSettle.label : null}
              seat={seat}
              me={me}
              isFacilitator={isFacilitator}
              hold={hold}
              clockOffset={clockOffset}
              onReveal={reveal}
              onError={fail}
              onOpenBacklog={() => setBacklogOpen(true)}
              onRecap={() => setRecapOpen(true)}
            />
          </PokerTable>

          {showResultsBelow && (
            <motion.section
              className="results-panel"
              aria-label={t.resultsRegion}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.5, delay: 0.3 }}
            >
              <Results
                table={table}
                story={activeStory!}
                seat={seat}
                isFacilitator={isFacilitator}
                onError={fail}
                facilitatorName={table.participants.find((p) => p.facilitator)?.name}
                part="body"
                onSettle={settle}
                onCancelSettle={cancelSettle}
                pendingLabel={pendingSettle && pendingSettle.storyId === activeStory?.id ? pendingSettle.label : null}
              />
            </motion.section>
          )}

          {/* On phones the reaction bar steps aside while voting: the hand needs the room. */}
          {!(narrow && votingOpen) && (
            <div className="dock-row">
              <ReactionDock onCheer={cheer} />
            </div>
          )}

          {!showResultsBelow && activeStory?.status !== 'REVEALED' && <Hand
            deck={table.deck}
            myVote={myVote}
            enabled={!!votingOpen && me.role === 'VOTER'}
            observer={me.role === 'OBSERVER'}
            storyKey={activeStory ? `${activeStory.id}:${activeStory.round}` : 'none'}
            onPick={vote}
          />}
        </main>
      </div>

      <AnimatePresence>
        {hold && (
          <motion.div
            className="countdown"
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-live="assertive"
            style={countdownAt ? ({ '--cx': `${countdownAt.x}px`, '--cy': `${countdownAt.y}px` } as React.CSSProperties) : undefined}
          >
            <AnimatePresence mode="popLayout">
              <motion.span
                key={hold.count}
                className="countdown-number"
                initial={{ scale: 2.2, opacity: 0, filter: 'blur(10px)' }}
                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.4, duration: 0.4, filter: { duration: 0.2, ease: 'easeOut' } }}
              >
                {hold.count}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <EffectsLayer ref={effects} seatRefs={seatRefs} />
      <Toasts toasts={toasts} onDismiss={dismiss} max={narrow ? 1 : 4} />
      <Sheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} title={t.shortcuts}>
        <dl className="shortcut-list">
          {t.shortcutList.map(([keys, what]) => (
            <div key={keys} className="shortcut-row">
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          className="btn btn-soft btn-md tour-replay"
          onClick={() => {
            setShortcutsOpen(false);
            setTouring(true);
          }}
        >
          {t.takeTour}
        </button>
      </Sheet>
      {touring && (
        <Tour
          label={t.takeTour}
          steps={buildSteps(t.tableTour, [
            ['welcome', undefined],
            ['backlog', '.backlog-toggle, .backlog'],
            ['felt', '.felt'],
            ['hand', '.hand-fan, .hand-observer'],
            ['seats', '.seat:not(.is-me) .seat-avatar, .seat.is-me .seat-avatar'],
            ['shortcuts', '.kbd-btn'],
          ])}
          onClose={() => {
            accounts.markTourSeen(account.email, 'table');
            setTouring(false);
          }}
        />
      )}
      <Recap open={recapOpen} onClose={() => setRecapOpen(false)} table={table} />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} me={me} seat={seat} account={account} onError={fail} onLeave={onLostSeat} />
      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} code={table.code} name={table.name} onCopied={() => toast(t.inviteCopied, 'success')} />
    </div>
  );
}

/** One sentence a screen reader can say after the flip: who played what, and where the team leans. */
function revealSummary(story: Story, table: Table): string {
  const result = story.result;
  const plays = story.votes
    .filter((v) => v.card)
    .map((v) => {
      const p = table.participants.find((x) => x.id === v.participantId);
      return `${p?.name ?? t.someone} ${v.card}`;
    })
    .join(', ');
  if (result?.consensus && story.votes[0]?.card) return t.revealConsensus(story.votes[0].card);
  const counts = Object.entries(result?.distribution ?? {})
    .filter(([label]) => label !== '?' && label !== '☕')
    .map(([, n]) => n)
    .sort((a, b) => b - a);
  const tied = counts.length > 1 && counts[0] === counts[1];
  return tied ? `${t.revealSummary(plays, null)} ${t.split}.` : t.revealSummary(plays, result?.suggestedEstimate ?? null);
}
