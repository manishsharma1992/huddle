import { t } from './i18n';

/** Warm, varied copy so a long refinement session never feels like a form being filled. */
const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

export const copy = {
  roundStart: () => pick(t.copy.roundStart),
  firstVote: (name: string) => pick(t.copy.firstVote(name)),
  everyoneIn: () => pick(t.copy.everyoneIn),
  consensus: () => pick(t.copy.consensus),
  spread: () => pick(t.copy.spread),
  outlierAsk: () => pick(t.copy.outlierAsk),
  estimated: (estimate: string) => pick(t.copy.estimated(estimate)),
  waiting: (name: string) => pick(t.copy.waiting(name)),
};
