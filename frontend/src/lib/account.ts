/**
 * Who you are on this browser: the profile you sign in with before using Huddle.
 * No passwords; it gates the app and travels with every table you open or join.
 */
export type Account = { email: string; firstName: string; lastName: string; team: string };

const ACCOUNT = 'huddle.account';
const TOURS = 'huddle.tours';

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
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: the person signs in again next visit */
  }
}

// ------------------------------------------------------------------ rules

/** bnpparibas.com or any of its subdomains (asia.bnpparibas.com, external.bnpparibas.com, …). */
const EMAIL = /^[^\s@]+@([a-z0-9-]+\.)*bnpparibas\.com$/i;
export const isCompanyEmail = (email: string) => EMAIL.test(email.trim());

/** "jean-baptiste" → "Jean-Baptiste", "marie claire" → "Marie Claire". */
export function formatFirstName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase()
    .replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase());
}

/** Surnames are always in capitals: "de la fontaine" → "DE LA FONTAINE". */
export function formatLastName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleUpperCase();
}

export const formatTeam = (value: string) => value.trim().replace(/\s+/g, ' ');

/** How you appear at the table: "Manish SHARMA". The server allows 30 characters. */
export function displayName(account: Pick<Account, 'firstName' | 'lastName'>): string {
  return `${account.firstName} ${account.lastName}`.trim().slice(0, 30).trim();
}

// ------------------------------------------------------------------ storage

export const accounts = {
  current(): Account | null {
    const a = read<Account | null>(ACCOUNT, null);
    return a && a.email && a.firstName && a.lastName && a.team ? a : null;
  },
  save(account: Account) {
    write(ACCOUNT, account);
  },
  signOut() {
    write(ACCOUNT, null);
  },
  /** Tours are remembered per person, so a colleague signing in on the same laptop still gets theirs. */
  tourSeen(email: string, tour: string): boolean {
    return read<Record<string, boolean>>(TOURS, {})[`${email.toLowerCase()}:${tour}`] === true;
  },
  markTourSeen(email: string, tour: string) {
    const seen = read<Record<string, boolean>>(TOURS, {});
    seen[`${email.toLowerCase()}:${tour}`] = true;
    write(TOURS, seen);
  },
};
