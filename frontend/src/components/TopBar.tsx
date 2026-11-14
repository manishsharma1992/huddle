import { AnimatePresence, motion } from 'framer-motion';
import type { Prefs } from '../App';
import type { Participant, Table } from '../lib/types';
import { Logo } from './Lobby';
import { bouncy } from './ui';
import { t } from '../lib/i18n';

export default function TopBar({
  table,
  me,
  online,
  connected,
  prefs,
  setPrefs,
  streak,
  onInvite,
  onRecap,
  onProfile,
  onBacklog,
  onShortcuts,
  onExit,
}: {
  table: Table;
  me: Participant;
  online: Set<string>;
  connected: boolean;
  prefs: Prefs;
  setPrefs: (p: Prefs) => void;
  streak: number;
  onInvite: () => void;
  onRecap: () => void;
  onProfile: () => void;
  onBacklog: () => void;
  onShortcuts: () => void;
  onExit: () => void;
}) {
  const nextTheme = prefs.theme === 'system' ? 'dark' : prefs.theme === 'dark' ? 'light' : 'system';
  const themeIcon = prefs.theme === 'system' ? '◐' : prefs.theme === 'dark' ? '☾' : '☀︎';
  const here = table.participants.filter((p) => online.has(p.id)).length;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn backlog-toggle" onClick={onBacklog} aria-label={t.backlog}>
          ☰
        </button>
        <button className="logo-btn" onClick={onExit} aria-label={t.backToLobbyAria}>
          <Logo compact />
        </button>
        <span className="topbar-divider" />
        <h1 className="table-title" title={table.name}>
          {table.name}
        </h1>
        <button className="code-chip" onClick={onInvite} title={t.invitePeople}>
          <span className="code-chip-label">{t.code}</span>
          <span className="code-chip-code">{table.code}</span>
          <span className="code-chip-plus" aria-hidden>+</span>
        </button>
      </div>

      <div className="topbar-right">
        <AnimatePresence>
          {!connected && (
            <motion.span className="pill pill-warn" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              {t.reconnecting}
            </motion.span>
          )}
          {streak >= 2 && (
            <motion.span key={streak} className="pill pill-streak" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={bouncy} title={t.inARowTitle}>
              {t.inARow(streak)}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="pill pill-online" title={t.onlineOf(here, table.participants.length)}>
          <span className="dot" /> {t.hereCount(here)}
        </span>
        <button className="pill pill-btn" onClick={onRecap} aria-label={t.recap}>
          📊 <span className="hide-sm">{t.recap}</span>
        </button>
        <button
          className="icon-btn"
          onClick={() => setPrefs({ ...prefs, sound: !prefs.sound })}
          aria-label={prefs.sound ? t.muteSounds : t.unmuteSounds}
          title={prefs.sound ? t.soundsOn : t.soundsOff}
        >
          {prefs.sound ? '🔊' : '🔇'}
        </button>
        <button className="icon-btn hide-sm kbd-btn" onClick={onShortcuts} aria-label={t.shortcuts} title={`${t.shortcuts} (?)`}>
          ?
        </button>
        <button className="icon-btn" onClick={() => setPrefs({ ...prefs, theme: nextTheme })} aria-label={t.theme(prefs.theme)} title={t.theme(prefs.theme)}>
          {themeIcon}
        </button>
        <button className="me-btn" onClick={onProfile} title={t.yourProfile} aria-label={`${t.yourProfile}: ${me.name}`}>
          <span className="me-avatar">{me.avatar}</span>
          <span className="me-name hide-sm">{me.name}</span>
        </button>
      </div>
    </header>
  );
}
