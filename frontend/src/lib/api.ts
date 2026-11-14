import { localizeServerMessage, t } from './i18n';
import type { Deck, Seat, Table, TableSummary } from './types';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown, seat?: Seat | null): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (seat) {
    headers['X-Participant-Id'] = seat.participantId;
    headers['X-Access-Key'] = seat.accessKey;
  }
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(t.cantReach, 0);
  }
  if (!response.ok) {
    let message = t.sideways;
    try {
      const problem = await response.json();
      message = problem.detail ? localizeServerMessage(problem.detail) : message;
    } catch {
      /* not JSON */
    }
    throw new ApiError(message, response.status);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  decks: () => request<Deck[]>('GET', '/decks'),
  recent: () => request<TableSummary[]>('GET', '/tables'),
  serverInfo: () => request<{ lanUrls: string[] }>('GET', '/server-info'),
  open: (body: { name: string; deckType: string; yourName: string; avatar: string }) => request<Seat>('POST', '/tables', body),
  table: (code: string) => request<Table>('GET', `/tables/${code}`),
  takeSeat: (code: string, body: { name: string; avatar: string; role: string }) => request<Seat>('POST', `/tables/${code}/seats`, body),
  me: (seat: Seat) => request<{ participantId: string; myVote: string | null; facilitator: boolean }>('GET', `/tables/${seat.code}/me`, undefined, seat),
  welcomeBack: (seat: Seat) => request<void>('POST', `/tables/${seat.code}/me/welcome-back`, undefined, seat),
  updateProfile: (seat: Seat, body: { name: string; avatar: string; role: string }) => request<void>('PUT', `/tables/${seat.code}/me`, body, seat),
  leave: (seat: Seat) => request<void>('DELETE', `/tables/${seat.code}/me`, undefined, seat),
  dismiss: (seat: Seat, participantId: string) => request<void>('DELETE', `/tables/${seat.code}/seats/${participantId}`, undefined, seat),
  handOver: (seat: Seat, participantId: string) => request<void>('PUT', `/tables/${seat.code}/facilitator`, { participantId }, seat),
  stepUp: (seat: Seat) => request<void>('POST', `/tables/${seat.code}/facilitator/step-up`, undefined, seat),
  addStories: (seat: Seat, titles: string[]) => request<void>('POST', `/tables/${seat.code}/stories`, { titles }, seat),
  removeStory: (seat: Seat, storyId: string) => request<void>('DELETE', `/tables/${seat.code}/stories/${storyId}`, undefined, seat),
  startVoting: (seat: Seat, storyId: string) => request<void>('POST', `/tables/${seat.code}/stories/${storyId}/voting`, undefined, seat),
  settle: (seat: Seat, storyId: string, card: string) => request<void>('POST', `/tables/${seat.code}/stories/${storyId}/estimate`, { card }, seat),
  vote: (seat: Seat, card: string) => request<void>('PUT', `/tables/${seat.code}/vote`, { card }, seat),
  retract: (seat: Seat) => request<void>('DELETE', `/tables/${seat.code}/vote`, undefined, seat),
  reveal: (seat: Seat) => request<void>('POST', `/tables/${seat.code}/reveal`, undefined, seat),
  revote: (seat: Seat) => request<void>('POST', `/tables/${seat.code}/revote`, undefined, seat),
  cancel: (seat: Seat) => request<void>('POST', `/tables/${seat.code}/cancel`, undefined, seat),
  timer: (seat: Seat, seconds: number) => request<void>('POST', `/tables/${seat.code}/timer`, { seconds }, seat),
  effect: (seat: Seat, kind: 'cheer' | 'throw', emoji: string, targetId?: string) =>
    request<void>('POST', `/tables/${seat.code}/effects`, { kind, emoji, targetId }, seat),
};
