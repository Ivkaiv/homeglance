/**
 * HAClient — единственная точка общения с Home Assistant.
 * WebSocket для подписки на изменения состояния, REST для команд и истории.
 *
 * Не делает никаких изменений в HA — только использует public APIs.
 */

import type {
  EntityId,
  HAState,
  StatesMap,
  ServiceCallData,
  ConnectionStatus,
  HAArea,
  HADevice,
  HAEntityRegistry,
  HARegistries,
} from './types';

type Listener = (states: StatesMap) => void;
type StatusListener = (status: ConnectionStatus) => void;
type RegistriesListener = (registries: HARegistries) => void;

export class HAClient {
  private url = '';
  private token = '';
  private wsUrl = '';
  private restUrl = '';

  private ws: WebSocket | null = null;
  private nextId = 1;
  private statesMap: StatesMap = {};
  private subscribers = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private registriesListeners = new Set<RegistriesListener>();
  private registries: HARegistries = { areas: {}, devices: {}, entities: {} };
  private status: ConnectionStatus = { status: 'idle' };
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  /**
   * Установить URL и token, запустить соединение.
   *
   * `overrides` позволяет подменить wsUrl/restUrl — нужно для режима
   * Ingress proxy, когда клиент идёт не на сам HA, а на add-on
   * (`/api/glance/ha-ws`, `/api/glance/ha-rest`), а supervisor токен
   * подставляется server-side.
   */
  connect(
    url: string,
    token: string,
    overrides?: { wsUrl?: string; restUrl?: string },
  ): void {
    this.url = url.replace(/\/$/, '');
    this.token = token;
    this.wsUrl = overrides?.wsUrl ?? this.url.replace(/^http/, 'ws') + '/api/websocket';
    this.restUrl = overrides?.restUrl ?? this.url + '/api';
    this.shouldReconnect = true;
    this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.setStatus({ status: 'disconnected' });
  }

  private openSocket(): void {
    this.setStatus({ status: 'connecting' });
    try {
      this.ws = new WebSocket(this.wsUrl);
    } catch (e: any) {
      this.setStatus({ status: 'error', error: e.message });
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      // Сервер сразу шлёт auth_required — ждём
    };

    this.ws.onmessage = (ev) => this.handleMessage(ev);

    this.ws.onerror = () => {
      // ошибки придут через onclose
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (this.status.status !== 'auth-failed') {
        this.setStatus({ status: 'disconnected' });
      }
      if (this.shouldReconnect) this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect) this.openSocket();
    }, 3000);
  }

  private handleMessage(ev: MessageEvent): void {
    let msg: any;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'auth_required':
        this.send({ type: 'auth', access_token: this.token });
        break;
      case 'auth_invalid':
        this.setStatus({ status: 'auth-failed', error: msg.message || 'Invalid token' });
        this.shouldReconnect = false;
        try {
          this.ws?.close();
        } catch {}
        break;
      case 'auth_ok':
        this.setStatus({ status: 'connected' });
        this.afterAuth();
        break;
      case 'event':
        if (msg.event?.event_type === 'state_changed') {
          this.applyStateChange(msg.event.data);
        }
        break;
      case 'result':
        const p = this.pending.get(msg.id);
        if (p) {
          this.pending.delete(msg.id);
          if (msg.success) p.resolve(msg.result);
          else p.reject(new Error(msg.error?.message || 'HA error'));
        }
        break;
    }
  }

  private async afterAuth(): Promise<void> {
    try {
      const states: HAState[] = await this.callWS({ type: 'get_states' });
      const map: StatesMap = {};
      for (const s of states) map[s.entity_id] = s;
      this.statesMap = map;
      this.notify();

      await this.callWS({ type: 'subscribe_events', event_type: 'state_changed' });

      // Параллельно подгружаем реестры areas/devices/entities — для красивых имён
      this.loadRegistries().catch(() => {});
    } catch (e: any) {
      this.setStatus({ status: 'error', error: e.message });
    }
  }

  private async loadRegistries(): Promise<void> {
    try {
      const [areas, devices, entities] = await Promise.all([
        this.callWS<HAArea[]>({ type: 'config/area_registry/list' }),
        this.callWS<HADevice[]>({ type: 'config/device_registry/list' }),
        this.callWS<HAEntityRegistry[]>({ type: 'config/entity_registry/list' }),
      ]);
      const reg: HARegistries = {
        areas: Object.fromEntries(areas.map((a) => [a.area_id, a])),
        devices: Object.fromEntries(devices.map((d) => [d.id, d])),
        entities: Object.fromEntries(entities.map((e) => [e.entity_id, e])),
      };
      this.registries = reg;
      for (const cb of this.registriesListeners) cb(reg);
    } catch (e) {
      // Не критично — fallback на friendly_name из states
      console.warn('Could not load HA registries:', e);
    }
  }

  private applyStateChange(data: any): void {
    const { entity_id, new_state } = data;
    if (!entity_id) return;
    if (new_state === null) {
      delete this.statesMap[entity_id];
    } else {
      this.statesMap = { ...this.statesMap, [entity_id]: new_state };
    }
    this.notify();
  }

  private notify(): void {
    for (const cb of this.subscribers) cb(this.statesMap);
  }

  private setStatus(s: ConnectionStatus): void {
    this.status = s;
    for (const cb of this.statusListeners) cb(s);
  }

  /** ───── Public API ───── */

  getStates(): StatesMap {
    return this.statesMap;
  }

  /** Базовый URL HA (например `http://homeassistant.local:8123`).
   *  Нужен виджетам, которые делают `<img src="${haUrl}${entity_picture}">`
   *  для камер/аватарок. До установки соединения возвращает пустую строку. */
  getUrl(): string {
    return this.url;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  subscribe(cb: Listener): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  onStatus(cb: StatusListener): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  getRegistries(): HARegistries {
    return this.registries;
  }

  onRegistries(cb: RegistriesListener): () => void {
    this.registriesListeners.add(cb);
    cb(this.registries);
    return () => this.registriesListeners.delete(cb);
  }

  async callService(
    domain: string,
    service: string,
    entity_id?: EntityId,
    data?: ServiceCallData
  ): Promise<void> {
    const msg: any = { type: 'call_service', domain, service, service_data: data ?? {} };
    if (entity_id) msg.target = { entity_id };
    await this.callWS(msg);
  }

  /** Прямой REST-вызов — для history и пр. */
  async restGet<T = any>(path: string): Promise<T> {
    const r = await fetch(`${this.restUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!r.ok) throw new Error(`HA REST ${r.status}: ${await r.text()}`);
    return r.json();
  }

  /** Получить прогноз погоды через WS-сервис weather.get_forecasts (return_response).
   *  Использует WS вместо REST — нет проблем с CORS и кэшем браузера. */
  async getWeatherForecast(
    entityId: EntityId,
    type: 'daily' | 'hourly' | 'twice_daily' = 'daily'
  ): Promise<Array<Record<string, any>>> {
    try {
      const result = await this.callWS<any>({
        type: 'call_service',
        domain: 'weather',
        service: 'get_forecasts',
        target: { entity_id: entityId },
        service_data: { type },
        return_response: true,
      });
      // result структура: { response: { 'weather.x': { forecast: [...] } } }
      return (
        result?.response?.[entityId]?.forecast ||
        result?.[entityId]?.forecast ||
        []
      );
    } catch {
      return [];
    }
  }

  /**
   * Запросить live-stream камеры. HA Stream Integration возвращает HLS
   * playlist (m3u8) с одноразовым токеном в URL — auth не нужен, hls.js
   * сам подгружает плейлист и сегменты.
   *
   * Возвращаемый URL HA даёт относительный — `/api/hls/<token>/master_playlist.m3u8`.
   * Чтобы he работал и под HA Ingress (когда клиент идёт через add-on-proxy,
   * а не на HA напрямую), склеиваем не с `this.url`, а с `this.restUrl`:
   *   - direct mode: restUrl = `<haUrl>/api` → результат `<haUrl>/api/hls/...`
   *   - proxy mode: restUrl = `<ingressBase>/api/glance/ha-rest` → результат
   *     `<ingressBase>/api/glance/ha-rest/hls/...`, который проходит через
   *     `[[...path]]`-роут add-on'а с подменой Authorization на supervisor-токен.
   * Поэтому из `result.url` обрезаем ведущий `/api/` (он уже в restUrl).
   *
   * Возвращает `null` если у камеры нет stream-source (камера без stream
   * integration, RTSP не подключён и т.п.).
   */
  async getCameraStreamUrl(entityId: EntityId): Promise<string | null> {
    try {
      const result = await this.callWS<{ url?: string }>({
        type: 'camera/stream',
        entity_id: entityId,
        format: 'hls',
      });
      if (!result?.url || !this.restUrl) return null;
      const haPath = result.url.replace(/^\/?api\//, '');
      return new URL(haPath, this.restUrl.replace(/\/$/, '') + '/').href;
    } catch {
      return null;
    }
  }

  async getHistory(
    entityIds: EntityId[],
    hoursBack = 24
  ): Promise<Record<EntityId, Array<{ s: string | number; lu: number }>>> {
    const result = await this.callWS<any>({
      type: 'history/history_during_period',
      start_time: new Date(Date.now() - hoursBack * 3600_000).toISOString(),
      end_time: new Date().toISOString(),
      entity_ids: entityIds,
      minimal_response: true,
      no_attributes: true,
      significant_changes_only: true,
    });
    return result || {};
  }

  /**
   * Frontend storage HA — облачно-нейтральный JSON-кэш на пользователя HA.
   * Доступен из любого устройства, где этот же пользователь авторизован.
   *
   * @see https://www.home-assistant.io/integrations/frontend/#websocket-api
   */
  async getUserData<T = unknown>(key: string): Promise<T | null> {
    try {
      const result = await this.callWS<{ value: T | null }>({
        type: 'frontend/get_user_data',
        key,
      });
      return result?.value ?? null;
    } catch {
      return null;
    }
  }

  async setUserData<T = unknown>(key: string, value: T): Promise<void> {
    await this.callWS({ type: 'frontend/set_user_data', key, value });
  }

  /**
   * Список Lovelace-дашбордов пользователя. Включая дефолтный (без url_path).
   */
  async listLovelaceDashboards(): Promise<
    Array<{ id: string; url_path: string | null; title: string; icon?: string }>
  > {
    try {
      return await this.callWS({ type: 'lovelace/dashboards/list' });
    } catch {
      return [];
    }
  }

  /**
   * Конфиг конкретного дашборда. url_path = null — дефолтный («overview»).
   * `force` — заставить HA отдать YAML-конфиг даже если включён storage-mode.
   */
  async getLovelaceConfig(urlPath: string | null = null): Promise<any | null> {
    try {
      return await this.callWS({
        type: 'lovelace/config',
        url_path: urlPath,
        force: false,
      });
    } catch {
      return null;
    }
  }

  /** ───── Private send / wait ───── */

  private send(msg: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private callWS<T = any>(msg: any): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.send({ ...msg, id });
      // timeout 30s
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('HA WS timeout'));
        }
      }, 30000);
    });
  }
}

// Singleton instance
let _client: HAClient | null = null;
export function getClient(): HAClient {
  if (!_client) _client = new HAClient();
  return _client;
}
