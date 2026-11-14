import type { KeyboardEvent } from 'react';

/**
 * Arrow-key movement for a group that is one Tab stop (radio groups, toolbars).
 * Returns the index to move to, or null when the key isn't a navigation key.
 */
export function rovingIndex(e: KeyboardEvent, index: number, count: number): number | null {
  let next: number | null = null;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % count;
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + count) % count;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = count - 1;
  if (next !== null) e.preventDefault();
  return next;
}

export function focusNth(e: KeyboardEvent, selector: string, index: number) {
  const group = (e.currentTarget as HTMLElement).closest('[data-roving]');
  group?.querySelectorAll<HTMLElement>(selector)[index]?.focus();
}
