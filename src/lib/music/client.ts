/**
 * WebSocket-клиент Music Assistant.
 *
 * Подключается к MA, проходит auth (или полагается на серверный прокси),
 * держит актуальный список плееров и очередей, отдаёт команды управления.
 * Сознательно простой: плееров мало (5-10), одна активная очередь — никакой
 * пер-сущностной оптимизации, как у HAClient, не нужно.
 */

import { getMAConfig } from './config';
import type { MAMessage, MAPlayer, MAQueue, MASearchResults, MAStatus } from './types';

type Listener = () => void;
type StatusListener = (s: MAStatus) => void;

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const CMD_TIMEOUT = 15000;
const RECONNECT_DELAY = 4000;
const REFETCH_DEBOUNCE = 500;

export class MAClient {
  private ws: WebSocket | null = null;
  private status: MAStatus = 'disconnected';
  private msgId = 0;
  private pending = new Map<string, Pending>();

  private players: MAPlayer[] = [];
  private queues: Record<string, MAQueue> = {};
  /** Локальный Date.now() момента последнего обновления данных — якорь для
   *  экстраполяции прогресса (часы MA-сервера и браузера расходятся). */
  private lastUpdate = 0;

  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private refetchTimer: ReturnType<typeof setTimeout> | null = null;
  private manualClose = false;
  private refCount = 0;

  // ── Управление жизненным циклом ────────────────────────────────────────
  // Подключение «ленивое»: WS открывается только пока на экране есть хотя бы
  // один музыкальный виджет. Без этого пустой homeglance без Music Assistant
  // бесконечно долбился бы в несуществующий сервер.
  acquire(): void {
    this.refCount++;
    if (this.refCount === 1) this.connect();
  }
  release(): void {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0) this.disconnect();
  }

  // ── Подключение ────────────────────────────────────────────────────────
  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const cfg = getMAConfig();
    if (!cfg) return;
    this.manualClose = false;
    this.setStatus('connecting');
    try {
      this.ws = new WebSocket(cfg.wsUrl);
    } catch {
      this.setStatus('error');
      this.scheduleReconnect();
      return;
    }
    this.ws.onmessage = (ev) => this.onMessage(ev.data, cfg.token);
    this.ws.onclose = () => this.onClose();
    this.ws.onerror = () => this.setStatus('error');
  }

  disconnect(): void {
    this.manualClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.setStatus('disconnected');
  }

  private onClose(): void {
    this.ws = null;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error('connection closed'));
    }
    this.pending.clear();
    if (!this.manualClose) {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.manualClose) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_DELAY);
  }

  // ── Обработка входящих сообщений ───────────────────────────────────────
  private async onMessage(raw: unknown, token: string | null): Promise<void> {
    let msg: MAMessage;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }

    // Ответ на команду
    if (msg.message_id !== undefined && msg.event === undefined) {
      const p = this.pending.get(msg.message_id);
      if (p) {
        clearTimeout(p.timer);
        this.pending.delete(msg.message_id);
        if (msg.error_code !== undefined) {
          p.reject(new Error(msg.details || `MA error ${msg.error_code}`));
        } else {
          p.resolve(msg.result);
        }
      }
      return;
    }

    // Событие — что-то изменилось на сервере
    if (msg.event) {
      this.onEvent(msg.event);
      return;
    }

    // Hello (server_id, без message_id и event) — начинаем рукопожатие
    if (msg.server_id) {
      await this.handshake(token);
    }
  }

  private async handshake(token: string | null): Promise<void> {
    try {
      // Прямое подключение — авторизуемся сами. Через прокси (token=null)
      // авторизацию уже сделал server.js, повторять не нужно.
      if (token) {
        await this.command('auth', { token });
      }
      await this.refreshAll();
      this.setStatus('connected');
    } catch {
      this.setStatus('error');
      this.ws?.close();
    }
  }

  private onEvent(event: string): void {
    // Любое событие про плеер/очередь — повод перечитать состояние.
    // queue_time_updated сыплется ~раз в секунду: это нам и нужно — так
    // elapsed_time остаётся свежим, а прогресс точным (debounce 500 мс
    // схлопывает всплески).
    if (event.startsWith('player') || event.startsWith('queue')) {
      this.debouncedRefetch();
    }
  }

  private debouncedRefetch(): void {
    if (this.refetchTimer) return;
    this.refetchTimer = setTimeout(() => {
      this.refetchTimer = null;
      this.refreshAll().catch(() => {});
    }, REFETCH_DEBOUNCE);
  }

  // ── Запрос/обновление состояния ────────────────────────────────────────
  private async refreshAll(): Promise<void> {
    const [players, queues] = await Promise.all([
      this.command('players/all') as Promise<MAPlayer[]>,
      this.command('player_queues/all') as Promise<MAQueue[]>,
    ]);
    this.players = Array.isArray(players) ? players : [];
    const rec: Record<string, MAQueue> = {};
    for (const q of Array.isArray(queues) ? queues : []) rec[q.queue_id] = q;
    this.queues = rec;
    this.lastUpdate = Date.now();
    this.notify();
  }

  /** Date.now() момента последнего успешного обновления данных. */
  getLastUpdate(): number {
    return this.lastUpdate;
  }

  /** Послать команду MA и дождаться результата. */
  command(command: string, args?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('not connected'));
        return;
      }
      const id = String(++this.msgId);
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`command timeout: ${command}`));
      }, CMD_TIMEOUT);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ command, message_id: id, args: args ?? {} }));
    });
  }

  // ── Геттеры / подписка ─────────────────────────────────────────────────
  getStatus(): MAStatus {
    return this.status;
  }
  getPlayers(): MAPlayer[] {
    return this.players;
  }
  getQueues(): Record<string, MAQueue> {
    return this.queues;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  onStatus(fn: StatusListener): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
  private setStatus(s: MAStatus): void {
    if (this.status === s) return;
    this.status = s;
    for (const l of this.statusListeners) l(s);
  }

  // ── Команды управления (player_id == queue_id в MA) ────────────────────
  playPause(playerId: string) {
    return this.command('players/cmd/play_pause', { player_id: playerId });
  }
  play(playerId: string) {
    return this.command('players/cmd/play', { player_id: playerId });
  }
  pause(playerId: string) {
    return this.command('players/cmd/pause', { player_id: playerId });
  }
  next(playerId: string) {
    return this.command('players/cmd/next', { player_id: playerId });
  }
  previous(playerId: string) {
    return this.command('players/cmd/previous', { player_id: playerId });
  }
  stop(playerId: string) {
    return this.command('players/cmd/stop', { player_id: playerId });
  }
  seek(playerId: string, position: number) {
    return this.command('players/cmd/seek', { player_id: playerId, position: Math.round(position) });
  }
  setVolume(playerId: string, volume: number) {
    return this.command('players/cmd/volume_set', {
      player_id: playerId,
      volume_level: Math.round(volume),
    });
  }
  setMute(playerId: string, muted: boolean) {
    return this.command('players/cmd/volume_mute', { player_id: playerId, muted });
  }
  /** Запустить media (uri или список uri) на плеере. */
  playMedia(playerId: string, media: string | string[]) {
    return this.command('player_queues/play_media', {
      queue_id: playerId,
      media,
      option: 'play',
    });
  }

  /** Поиск по медиатеке всех источников. */
  async search(query: string, limit = 12): Promise<MASearchResults> {
    const r = (await this.command('music/search', {
      search_query: query,
      limit,
    })) as Partial<MASearchResults> | null;
    return {
      tracks: r?.tracks ?? [],
      artists: r?.artists ?? [],
      albums: r?.albums ?? [],
      playlists: r?.playlists ?? [],
    };
  }
}

let singleton: MAClient | null = null;

export function getMAClient(): MAClient {
  if (!singleton) singleton = new MAClient();
  return singleton;
}
