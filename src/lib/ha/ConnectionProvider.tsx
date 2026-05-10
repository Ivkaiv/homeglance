'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useCallback,
  useSyncExternalStore,
} from 'react';
import { getClient, HAClient } from './client';
import type { StatesMap, ConnectionStatus, HAState, EntityId, HARegistries } from './types';
import { loadConnection, saveConnection, clearConnection } from './connection-storage';

interface ConnectionContextValue {
  client: HAClient;
  status: ConnectionStatus;
  states: StatesMap;
  registries: HARegistries;
  /** true когда есть сохранённый URL+token — можно подключаться */
  hasCredentials: boolean;
  /** true когда инициализация (чтение localStorage) завершена. До этого момента
   *  нельзя редиректить — иначе на refresh происходит бросок на /onboarding
   *  до того как credentials успели прочитаться. */
  initialized: boolean;
  /** true когда коннект установлен и стейты получены */
  isReady: boolean;
  /** Сохранить новые credentials на сервере и переподключиться */
  connectTo: (url: string, token: string) => Promise<void>;
  /** Очистить credentials и отключиться */
  forget: () => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => getClient(), []);
  const [status, setStatus] = useState<ConnectionStatus>(client.getStatus());
  const [states, setStates] = useState<StatesMap>(client.getStates());
  const [hasCredentials, setHasCredentials] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [registries, setRegistries] = useState<HARegistries>(client.getRegistries());

  useEffect(() => {
    let cancelled = false;
    loadConnection()
      .then(async (conn) => {
        if (cancelled) return;
        if (conn) {
          setHasCredentials(true);
          client.connect(conn.url, conn.token);
          setInitialized(true);
          return;
        }
        // Авто-подключение через SUPERVISOR_TOKEN не работает: HA WebSocket
        // его отвергает (auth_invalid). Оставляем manual onboarding —
        // OnboardingPage под ingress подставляет URL=window.location.origin
        // автоматически, пользователю остаётся только вставить LLT-токен.
        if (!cancelled) setInitialized(true);
      })
      .catch(() => {
        if (!cancelled) setInitialized(true);
      });

    const offStatus = client.onStatus(setStatus);
    const offStates = client.subscribe(setStates);
    const offReg = client.onRegistries(setRegistries);

    return () => {
      cancelled = true;
      offStatus();
      offStates();
      offReg();
    };
  }, [client]);

  const isReady = status.status === 'connected' && Object.keys(states).length > 0;

  const connectTo = useCallback(
    async (url: string, token: string) => {
      await saveConnection({ url, token });
      setHasCredentials(true);
      client.connect(url, token);
    },
    [client]
  );

  const forget = useCallback(async () => {
    await clearConnection();
    client.disconnect();
    setHasCredentials(false);
  }, [client]);

  return (
    <ConnectionContext.Provider value={{ client, status, states, registries, hasCredentials, initialized, isReady, connectTo, forget }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error('useConnection must be used inside <ConnectionProvider>');
  return ctx;
}

/**
 * Хук для одного entity. Использует useSyncExternalStore + getClient(),
 * чтобы подписаться напрямую на HAClient (минуя React-контекст). React
 * сравнивает результат getSnapshot через Object.is — а HAClient переписывает
 * statesMap иммутабельно (`{ ...prev, [id]: new }`), оставляя ссылки на
 * нетронутые HAState прежними. Поэтому компонент перерисовывается **только
 * когда меняется state именно этого entityId**, а не любого из сотен других.
 *
 * До рефакторинга useEntity читал states из контекста — и каждый виджет
 * (свет, климат, плеер) ререндерился при ЛЮБОМ state_changed в HA. На
 * 50+ виджетах × 100 событий/мин это была главная perf-проблема.
 */
export function useEntity(entityId: EntityId | undefined): HAState | undefined {
  const client = getClient();
  const subscribe = useCallback(
    (onStoreChange: () => void) => client.subscribe(() => onStoreChange()),
    [client]
  );
  const getSnapshot = useCallback(
    () => (entityId ? client.getStates()[entityId] : undefined),
    [client, entityId]
  );
  // SSR fallback: до hydration отдаём undefined
  const getServerSnapshot = useCallback(() => undefined, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Хук для всех states. Аккуратно — ререндер при любом изменении. */
export function useStates(): StatesMap {
  return useConnection().states;
}

/** Helper для вызова сервиса. */
export function useCallService() {
  const { client } = useConnection();
  return client.callService.bind(client);
}

/** Точка истории: timestamp (мс) + значение */
export interface HistoryPoint {
  t: number;
  v: number;
}

/**
 * Хук для истории сущности (для графиков). Запрашивает state-changes за
 * последние N часов и обновляется раз в 5 минут.
 */
export function useHAHistory(
  entityId: EntityId | undefined,
  hoursBack = 24
): { points: HistoryPoint[]; loading: boolean } {
  const { client, isReady } = useConnection();
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId || !isReady) {
      setPoints([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const history = await client.getHistory([entityId], hoursBack);
        if (cancelled) return;
        const raw = history[entityId] || [];
        const pts: HistoryPoint[] = [];
        for (const p of raw) {
          const v = Number(p.s);
          if (!Number.isNaN(v)) pts.push({ t: p.lu * 1000, v });
        }
        setPoints(pts);
      } catch {
        if (!cancelled) setPoints([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [client, entityId, hoursBack, isReady]);

  return { points, loading };
}

/**
 * Хук для прогноза погоды. Подгружает прогноз раз в 30 минут через
 * сервис weather.get_forecasts (REST API с return_response=true).
 */
export function useWeatherForecast(
  entityId: EntityId | undefined,
  type: 'daily' | 'hourly' | 'twice_daily' = 'daily'
): Array<Record<string, any>> {
  const { client, isReady } = useConnection();
  const [forecast, setForecast] = useState<Array<Record<string, any>>>([]);

  useEffect(() => {
    if (!entityId || !isReady) {
      setForecast([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const f = await client.getWeatherForecast(entityId, type);
      if (!cancelled) setForecast(f);
    };
    load();
    const interval = setInterval(load, 30 * 60 * 1000); // 30 мин
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [client, entityId, type, isReady]);

  return forecast;
}
