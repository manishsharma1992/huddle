import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { Prefs } from '../App';
import { api, ApiError } from '../lib/api';
import { t } from '../lib/i18n';
import { AVATARS, identity } from '../lib/identity';
import type { Seat, Table } from '../lib/types';
import { Logo } from './Lobby';
import TableScreen from './TableScreen';
import { AvatarPicker, Button, Field, RoleToggle, spring } from './ui';

type State =
  | { phase: 'loading' }
  | { phase: 'missing'; message: string }
  | { phase: 'join'; table: Table }
  | { phase: 'seated'; seat: Seat };

export default function TableRoute({ code, prefs, setPrefs, onExit }: { code: string; prefs: Prefs; setPrefs: (p: Prefs) => void; onExit: () => void }) {
  const [state, setState] = useState<State>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const table = await api.table(code);
        const seat = identity.seat(code);
        if (seat) {
          try {
            await api.me(seat);
            if (!cancelled) setState({ phase: 'seated', seat });
            return;
          } catch (err) {
            if (err instanceof ApiError && err.status === 403) identity.forgetSeat(code);
            else throw err;
          }
        }
        if (!cancelled) setState({ phase: 'join', table });
      } catch (err) {
        if (!cancelled) setState({ phase: 'missing', message: (err as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (state.phase === 'loading') {
    return (
      <div className="center-screen">
        <motion.div className="loader" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
      </div>
    );
  }
  if (state.phase === 'missing') {
    return (
      <div className="center-screen">
        <div className="panel narrow">
          <h2>{t.tableMissing}</h2>
          <p className="muted">{state.message}</p>
          <Button variant="primary" onClick={onExit}>
            {t.backToLobby}
          </Button>
        </div>
      </div>
    );
  }
  if (state.phase === 'join') {
    return <JoinTable table={state.table} onSeated={(seat) => setState({ phase: 'seated', seat })} onExit={onExit} />;
  }
  return (
    <TableScreen
      seat={state.seat}
      prefs={prefs}
      setPrefs={setPrefs}
      onExit={onExit}
      onLostSeat={() => {
        identity.forgetSeat(code);
        onExit();
      }}
    />
  );
}

function JoinTable({ table, onSeated, onExit }: { table: Table; onSeated: (seat: Seat) => void; onExit: () => void }) {
  const saved = identity.profile();
  const [name, setName] = useState(saved.name);
  const [avatar, setAvatar] = useState(saved.avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [role, setRole] = useState<'VOTER' | 'OBSERVER'>('VOTER');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      identity.saveProfile({ name: name.trim(), avatar });
      const seat = await api.takeSeat(table.code, { name: name.trim(), avatar, role });
      identity.saveSeat(seat);
      onSeated(seat);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="center-screen join-screen">
      <div className="lobby-glow" aria-hidden />
      <button className="back-link" onClick={onExit} aria-label={t.backToLobbyAria}>
        <Logo compact />
      </button>
      <motion.form className="panel join-panel" onSubmit={submit} initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring}>
        <span className="eyebrow">{t.invitedTo}</span>
        <h1 className="join-title">{table.name}</h1>
        <div className="join-crowd" aria-label={t.peopleAtTable(table.participants.length)}>
          {table.participants.slice(0, 8).map((p, i) => (
            <motion.span
              key={p.id}
              className="crowd-avatar"
              title={p.name}
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0.5, duration: 0.5, delay: 0.1 + i * 0.05 }}
            >
              {p.avatar}
            </motion.span>
          ))}
          <span className="muted small">
            {table.participants.length === 0 ? t.beFirst : t.alreadySeated(table.participants.length)}
          </span>
        </div>

        <Field label={t.yourName}>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required placeholder="Alex" />
        </Field>
        <Field label={t.yourCharacter} group>
          <AvatarPicker value={avatar} onChange={setAvatar} />
        </Field>
        <Field label={t.hereTo} group>
          <RoleToggle value={role} onChange={setRole} label={t.hereTo} labels={{ VOTER: t.playCards, OBSERVER: t.justWatch }} pillId="role-pill" />
        </Field>
        {error && <p className="error-text">{error}</p>}
        <Button variant="primary" size="lg" type="submit" disabled={busy || !name.trim()}>
          {busy ? t.pullingChair : t.takeSeat}
        </Button>
        {!name.trim() && <p className="field-hint cta-hint">{t.nameFirst}</p>}
      </motion.form>
    </div>
  );
}
