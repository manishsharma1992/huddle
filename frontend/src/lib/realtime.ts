import { Client } from '@stomp/stompjs';
import { useEffect, useRef, useState } from 'react';
import type { ChannelMessage } from './types';

/** Subscribes to a table's live channel. Reconnects automatically; calls onOpen after every (re)connect. */
export function useTableChannel(
  code: string,
  participantId: string | null,
  onMessage: (message: ChannelMessage) => void,
  onOpen: () => void,
) {
  const [connected, setConnected] = useState(false);
  const handlers = useRef({ onMessage, onOpen });
  handlers.current = { onMessage, onOpen };

  useEffect(() => {
    if (!participantId) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const client = new Client({
      brokerURL: `${protocol}://${window.location.host}/ws`,
      connectHeaders: { table: code, participant: participantId },
      reconnectDelay: 1500,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/tables/${code}`, (frame) => {
          let message: ChannelMessage;
          try {
            message = JSON.parse(frame.body) as ChannelMessage;
          } catch {
            return; // malformed frame
          }
          try {
            handlers.current.onMessage(message);
          } catch (err) {
            console.error('Failed to handle table update', err);
          }
        });
        handlers.current.onOpen();
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    });
    client.activate();
    return () => {
      void client.deactivate();
    };
  }, [code, participantId]);

  return connected;
}
