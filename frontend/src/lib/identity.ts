import type { Seat } from './types';

const SEATS = 'huddle.seats';
const PROFILE = 'huddle.profile';
const PREFS = 'huddle.prefs';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: fine, we just forget */
  }
}

export const identity = {
  seat(code: string): Seat | null {
    return read<Record<string, Seat>>(SEATS, {})[code.toUpperCase()] ?? null;
  },
  saveSeat(seat: Seat) {
    const seats = read<Record<string, Seat>>(SEATS, {});
    seats[seat.code.toUpperCase()] = seat;
    write(SEATS, seats);
  },
  forgetSeat(code: string) {
    const seats = read<Record<string, Seat>>(SEATS, {});
    delete seats[code.toUpperCase()];
    write(SEATS, seats);
  },
  profile(): { name: string; avatar: string } {
    return read(PROFILE, { name: '', avatar: '' });
  },
  saveProfile(profile: { name: string; avatar: string }) {
    write(PROFILE, profile);
  },
  prefs(): { sound: boolean; theme: 'system' | 'light' | 'dark' } {
    return read(PREFS, { sound: true, theme: 'system' as const });
  },
  savePrefs(prefs: { sound: boolean; theme: 'system' | 'light' | 'dark' }) {
    write(PREFS, prefs);
  },
};

export const AVATARS = ['🦊', '🐼', '🐨', '🐯', '🦁', '🐸', '🐙', '🦄', '🐳', '🦉', '🐧', '🐝', '🐢', '🦋', '🐻', '🐰', '🦖', '🐬', '🦜', '🐹', '🦔', '🐞', '🦩', '🐲'];

const HUES = [152, 200, 265, 330, 24, 45, 180, 290];
export function hueFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return HUES[Math.abs(hash) % HUES.length];
}
