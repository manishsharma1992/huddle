import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import { useTableChannel } from './realtime';
import type { ChannelMessage, Effect, Seat, Table, TableEvent } from './types';

type Listeners = {
  events?: (events: TableEvent[], table: Table) => void;
  effect?: (effect: Effect) => void;
};

/**
 * Keeps the local picture of the table in sync: a REST snapshot on every (re)connect, then live updates
 * over the WebSocket. Older snapshots are ignored so out-of-order frames can never rewind the table.
 */
export function useTable(seat: Seat, onLostSeat: () => void) {
  const [table, setTable] = useState<Table | null>(null);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [myVote, setMyVote] = useState<string | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const lastServerTime = useRef(0);
  const listeners = useRef<Listeners>({});
  const lostSeat = useRef(onLostSeat);
  lostSeat.current = onLostSeat;

  const apply = useCallback((next: Table) => {
    if (next.serverTime < lastServerTime.current) return false;
    lastServerTime.current = next.serverTime;
    setClockOffset(next.serverTime - Date.now());
    setTable(next);
    if (!next.participants.some((p) => p.id === seat.participantId)) {
      lostSeat.current();
    }
    return true;
  }, [seat.participantId]);

  const refresh = useCallback(async () => {
    try {
      const [snapshot, me] = await Promise.all([api.table(seat.code), api.me(seat)]);
      apply(snapshot);
      setMyVote(me.myVote);
      setOnline(new Set(snapshot.participants.filter((p) => p.online).map((p) => p.id)));
    } catch {
      /* the channel will retry on reconnect */
    }
  }, [apply, seat]);

  const onMessage = useCallback(
    (message: ChannelMessage) => {
      if (message.kind === 'table') {
        if (!apply(message.table)) return;
        if (message.events.some((e) => ['VotingStarted', 'VotingCancelled', 'StoryEstimated'].includes(e.type))) {
          setMyVote(null);
        }
        listeners.current.events?.(message.events, message.table);
      } else if (message.kind === 'presence') {
        setOnline(new Set(message.online));
      } else if (message.kind === 'effect') {
        listeners.current.effect?.(message.effect);
      }
    },
    [apply],
  );

  const connected = useTableChannel(seat.code, seat.participantId, onMessage, refresh);

  useEffect(() => {
    void api.welcomeBack(seat).catch(() => undefined);
  }, [seat]);

  return { table, online, myVote, setMyVote, connected, clockOffset, listeners, refresh };
}
