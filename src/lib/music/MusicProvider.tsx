'use client';

/**
 * React-контекст для Music Assistant.
 *
 * Аналог ConnectionProvider, но для отдельного музыкального сервера.
 * Подключение ленивое: useMAConnection() в виджете делает acquire/release,
 * клиент держит WS открытым, только пока на экране есть музыкальный виджет.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getMAClient, type MAClient } from './client';
import type { MAPlayer, MAQueue, MAStatus } from './types';

interface MusicContextValue {
  client: MAClient;
  status: MAStatus;
  players: MAPlayer[];
  queues: Record<string, MAQueue>;
  isReady: boolean;
}

const MusicContext = createContext<MusicContextValue | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => getMAClient(), []);
  const [status, setStatus] = useState<MAStatus>(client.getStatus());
  const [players, setPlayers] = useState<MAPlayer[]>(client.getPlayers());
  const [queues, setQueues] = useState<Record<string, MAQueue>>(client.getQueues());

  useEffect(() => {
    const offStatus = client.onStatus(setStatus);
    const offState = client.subscribe(() => {
      setPlayers(client.getPlayers());
      setQueues(client.getQueues());
    });
    return () => {
      offStatus();
      offState();
    };
  }, [client]);

  const isReady = status === 'connected';

  const value = useMemo<MusicContextValue>(
    () => ({ client, status, players, queues, isReady }),
    [client, status, players, queues, isReady]
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic(): MusicContextValue {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used inside <MusicProvider>');
  return ctx;
}

/**
 * Удерживает WS-подключение к Music Assistant, пока компонент смонтирован.
 * Вызывать в каждом музыкальном виджете.
 */
export function useMAConnection(): void {
  const { client } = useMusic();
  useEffect(() => {
    client.acquire();
    return () => client.release();
  }, [client]);
}

/** Плееры, пригодные для показа как «выход» (без скрытых). */
export function useMAPlayers(): MAPlayer[] {
  const { players } = useMusic();
  return useMemo(
    () => players.filter((p) => !p.hide_in_ui && p.available),
    [players]
  );
}

/** Очередь конкретного плеера (queue_id == player_id). */
export function useMAQueue(playerId: string | undefined): MAQueue | undefined {
  const { queues } = useMusic();
  return playerId ? queues[playerId] : undefined;
}
