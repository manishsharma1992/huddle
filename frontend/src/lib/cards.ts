import { formatNumber, t } from './i18n';
import type { Card } from './types';

/**
 * Size cards (XS, S, M, …) carry story points behind a word. Numeric decks already show their points,
 * so only cards whose label is letters get the extra "3 pts" caption.
 */
export function sizePoints(card: Card | undefined | null): number | null {
  if (!card || card.value === null) return null;
  return /^[A-Za-z]+$/.test(card.label) ? card.value : null;
}

export function pointsFor(deck: Card[], label: string | null | undefined): number | null {
  if (!label) return null;
  return sizePoints(deck.find((c) => c.label === label));
}

export function pointsLabel(points: number | null): string | null {
  return points === null ? null : t.pointsShort(formatNumber(points));
}

export const isSizeDeck = (deck: Card[]) => deck.some((c) => sizePoints(c) !== null);

/** What a person can type to play a card: its label, and for size cards also its points. */
export function typedKeys(card: Card): string[] {
  const keys = [card.label.toUpperCase()];
  const points = sizePoints(card);
  if (points !== null) keys.push(String(points));
  // Labels a keyboard can't produce (½) answer to their number: "0.5" or ".5".
  if (card.value !== null && /[^\x20-\x7E]/.test(card.label)) {
    keys.push(String(card.value));
    if (card.value > 0 && card.value < 1) keys.push(String(card.value).replace(/^0/, ''));
  }
  return keys;
}
