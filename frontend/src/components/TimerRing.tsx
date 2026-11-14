import { useEffect, useState } from 'react';
import { t } from '../lib/i18n';
import { sound } from '../lib/sound';

export default function TimerRing({ endsAt, startedAt, clockOffset }: { endsAt: number; startedAt: number | null; clockOffset: number }) {
  const [now, setNow] = useState(() => Date.now() + clockOffset);
  const [total] = useState(() => Math.max(10000, endsAt - (Date.now() + clockOffset)));

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + clockOffset), 250);
    return () => clearInterval(id);
  }, [clockOffset]);

  const remaining = Math.max(0, endsAt - now);
  const seconds = Math.ceil(remaining / 1000);
  useEffect(() => {
    if (seconds > 0 && seconds <= 5) sound.tick();
  }, [seconds]);

  void startedAt;
  const progress = remaining / total;
  const r = 15;
  const c = 2 * Math.PI * r;
  const urgent = seconds <= 10;
  return (
    <span className={`timer-ring ${urgent ? 'is-urgent' : ''} ${remaining === 0 ? 'is-done' : ''}`} role="timer" aria-label={t.secondsLeft(seconds)}>
      <svg viewBox="0 0 36 36" width="36" height="36">
        <circle cx="18" cy="18" r={r} className="timer-track" />
        <circle cx="18" cy="18" r={r} className="timer-fill" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} />
      </svg>
      <span className="timer-text">{remaining === 0 ? '⏰' : seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : seconds}</span>
    </span>
  );
}
