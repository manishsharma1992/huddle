import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { pointsLabel, sizePoints } from '../lib/cards';
import { t } from '../lib/i18n';
import { focusNth, rovingIndex } from '../lib/roving';
import { AVATARS, identity } from '../lib/identity';
import type { Deck, TableSummary } from '../lib/types';
import { AvatarPicker, Button, Field, bouncy, spring } from './ui';
import { PlayingCard } from './PlayingCard';

const HERO_CARDS = ['1', '3', '5', '8', '13'];
const LIVE_LIMIT = 5;
const STALE_MS = 12 * 60 * 60 * 1000;

function timeAgo(ms: number) {
  const minutes = Math.round((Date.now() - ms) / 60000);
  if (minutes < 1) return t.justNow;
  if (minutes < 60) return t.minAgo(minutes);
  return t.hAgo(Math.round(minutes / 60));
}

export default function Lobby({ onEnter }: { onEnter: (code: string) => void }) {
  const saved = identity.profile();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [recent, setRecent] = useState<TableSummary[] | null>(null);
  const [tableName, setTableName] = useState('');
  const [deckType, setDeckType] = useState('FIBONACCI');
  const [name, setName] = useState(saved.name);
  const [avatar, setAvatar] = useState(saved.avatar || AVATARS[Math.floor(Math.random() * 12)]);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllLive, setShowAllLive] = useState(false);

  useEffect(() => {
    api.decks().then(setDecks).catch(() => undefined);
    api.recent().then(setRecent).catch(() => setRecent([]));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      identity.saveProfile({ name: name.trim(), avatar });
      const seat = await api.open({ name: tableName.trim() || t.tableOf(name.trim()), deckType, yourName: name.trim(), avatar });
      identity.saveSeat(seat);
      onEnter(seat.code);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    const fromLink = code.match(/\/t\/([A-Z0-9]{6})/i)?.[1];
    const finalCode = (fromLink ?? code).toUpperCase();
    if (/^[A-Z0-9]{6}$/.test(finalCode)) onEnter(finalCode);
    else setError(t.badCode);
  }

  const selectedDeck = decks.find((d) => d.type === deckType);
  // Only tables people are actually at, freshest first; empty or day-old tables are noise.
  const live = (recent ?? []).filter((r) => r.participantCount > 0 && Date.now() - r.updatedAt < STALE_MS);
  const shownLive = showAllLive ? live : live.slice(0, LIVE_LIMIT);

  return (
    <div className="lobby">
      <div className="lobby-glow" aria-hidden />
      <header className="lobby-top">
        <Logo />
      </header>

      <section className="hero">
        <motion.div className="hero-copy" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.05 }}>
          <h1 className="display">
            <span className="display-line">{t.heroTitleA}</span>
            <span className="display-line display-accent">{t.heroTitleB}</span>
          </h1>
          <p className="lede">
            <strong>{t.heroEyebrow}.</strong> {t.heroLede}
          </p>
        </motion.div>
        <div className="hero-fan" aria-hidden>
          {HERO_CARDS.map((label, i) => (
            <motion.div
              key={label}
              className="hero-card"
              initial={{ opacity: 0, y: 80, rotate: 0 }}
              animate={{ opacity: 1, y: Math.abs(i - 2) * 14, rotate: (i - 2) * 9 }}
              transition={{ ...bouncy, delay: 0.15 + i * 0.07 }}
              whileHover={{ y: -24, rotate: (i - 2) * 9, scale: 1.06, transition: bouncy }}
            >
              <PlayingCard label={label} faceUp size="lg" />
            </motion.div>
          ))}
        </div>
      </section>

      <section className="lobby-grid">
        <motion.form className="panel create" onSubmit={create} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.2 }}>
          <h2>{t.openTable}</h2>
          <Field label={t.refiningLabel}>
            <input className="input" value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder={name.trim() ? t.tableOf(name.trim()) : t.refiningPlaceholder} maxLength={80} />
          </Field>
          <Field label={t.yourName}>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" maxLength={30} required />
          </Field>
          <Field label={t.yourCharacter} group>
            <AvatarPicker value={avatar} onChange={setAvatar} />
          </Field>
          <Field label={t.deck} group>
            <div className="deck-options" role="radiogroup" aria-label={t.deck} data-roving>
              {decks.map((deck, i) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={deck.type === deckType}
                  key={deck.type}
                  className={`deck-option ${deck.type === deckType ? 'is-on' : ''}`}
                  tabIndex={deck.type === deckType ? 0 : -1}
                  onClick={() => setDeckType(deck.type)}
                  onKeyDown={(e) => {
                    const next = rovingIndex(e, i, decks.length);
                    if (next === null) return;
                    setDeckType(decks[next].type);
                    focusNth(e, '[role="radio"]', next);
                  }}
                >
                  {deck.type === deckType && <motion.span layoutId="deck-pill" className="deck-pill" transition={spring} />}
                  <span className="deck-name">{t.decks[deck.type] ?? deck.name}</span>
                </button>
              ))}
            </div>
            <AnimatePresence mode="popLayout" initial={false}>
              {selectedDeck && (
                <motion.div key={selectedDeck.type} className="deck-preview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring}>
                  <span className="sr-only">
                    {t.deckCards(selectedDeck.cards.map((c) => (sizePoints(c) !== null ? `${c.label} ${pointsLabel(sizePoints(c))}` : c.label)).join(', '))}
                  </span>
                  {selectedDeck.cards.map((card) => {
                    const points = sizePoints(card);
                    return (
                      <span key={card.label} className="chip-card" aria-hidden>
                        {card.label}
                        {points !== null && <span className="chip-points">{points}</span>}
                      </span>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </Field>
          <Button variant="primary" size="lg" type="submit" disabled={busy || !name.trim()}>
            {busy ? t.settingTable : t.openTableCta}
          </Button>
          {!name.trim() && <p className="field-hint cta-hint">{t.nameFirst}</p>}
        </motion.form>

        <motion.div className="side-stack" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.28 }}>
          <form className="panel join" onSubmit={join}>
            <h2>{t.joinTable}</h2>
            <p className="muted">{t.joinHelp}</p>
            <div className="join-row">
              <input
                className="input code-input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="K7QF9M"
                aria-label={t.tableCode}
                autoCapitalize="characters"
              />
              <Button variant="primary" type="submit" disabled={!joinCode.trim()}>
                {t.join}
              </Button>
            </div>
          </form>

          <div className="panel recent">
            <h2>{t.liveOnNetwork}</h2>
            {recent === null ? (
              <ul className="recent-list" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="recent-skeleton" />
                ))}
              </ul>
            ) : live.length === 0 ? (
              <p className="muted">{t.noTablesYet}</p>
            ) : (
              <ul className="recent-list">
                {shownLive.map((table, i) => (
                  <motion.li key={table.code} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.3 + i * 0.04 }}>
                    <button className="recent-item" onClick={() => onEnter(table.code)}>
                      <span className="recent-name">{table.name}</span>
                      <span className="recent-meta">
                        {t.people(table.participantCount)} · {timeAgo(table.updatedAt)}
                      </span>
                      <span className="recent-code">{table.code}</span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
            {live.length > LIVE_LIMIT && (
              <button type="button" className="link show-more" onClick={() => setShowAllLive((v) => !v)}>
                {showAllLive ? t.showLess : t.showAll(live.length)}
              </button>
            )}
          </div>
        </motion.div>
      </section>

      <AnimatePresence>
        {error && (
          <motion.div className="toast toast-error lobby-toast" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onClick={() => setError(null)}>
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** BNP Paribas lockup followed by the Huddle wordmark. The bank's mark swaps to its reversed (white) artwork in dark mode. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`logo ${compact ? 'logo-compact' : ''}`}>
      <span className="brand" role="img" aria-label={t.brandAria}>
        <img className="brand-img brand-img-light" src="/bnp-mark-light.png" alt="" draggable={false} />
        <img className="brand-img brand-img-dark" src="/bnp-mark-dark.png" alt="" draggable={false} />
      </span>
      <span className="brand-divider" aria-hidden />
      <span className="logo-mark" aria-hidden>
        <span />
        <span />
      </span>
      <span className="logo-word">Huddle</span>
    </span>
  );
}
