/**
 * Типы для интеграции с Music Assistant.
 *
 * Music Assistant — отдельный музыкальный сервер (Docker на NUC). Glance
 * общается с ним по WebSocket JSON-RPC. Это не Home Assistant — у MA свой
 * протокол, поэтому отдельный слой (см. client.ts / MusicProvider.tsx).
 */

export type MAStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Что играет на плеере прямо сейчас (Player.current_media в MA). */
export interface MAPlayerMedia {
  uri?: string;
  title?: string;
  artist?: string;
  album?: string;
  image_url?: string;
  duration?: number;
}

/** Устройство вывода (колонка / ТВ / приставка), известное Music Assistant. */
export interface MAPlayer {
  player_id: string;
  name: string;
  available: boolean;
  powered?: boolean;
  /** 'playing' | 'paused' | 'idle' */
  playback_state?: string;
  volume_level?: number;
  volume_muted?: boolean;
  elapsed_time?: number;
  elapsed_time_last_updated?: number;
  current_media?: MAPlayerMedia | null;
  /** Битовый/строковый список фич — пока не разбираем детально. */
  supported_features?: unknown;
  icon?: string;
  /** Плееры с hide_in_ui не показываем в списке выходов. */
  hide_in_ui?: boolean;
  provider?: string;
  type?: string;
}

/** Очередь воспроизведения, привязанная к плееру (queue_id == player_id). */
export interface MAQueue {
  queue_id: string;
  display_name: string;
  active: boolean;
  /** 'playing' | 'paused' | 'idle' */
  state?: string;
  elapsed_time?: number;
  elapsed_time_last_updated?: number;
  current_index?: number | null;
  current_item?: MAQueueItem | null;
  next_item?: MAQueueItem | null;
  shuffle_enabled?: boolean;
  /** 'off' | 'one' | 'all' */
  repeat_mode?: string;
}

export interface MAQueueItem {
  queue_item_id?: string;
  name?: string;
  duration?: number;
  media_item?: MAMediaItem | null;
  image?: MAImage | null;
}

/** Элемент медиатеки источника — трек / альбом / артист / плейлист. */
export interface MAMediaItem {
  item_id?: string;
  provider?: string;
  name?: string;
  uri?: string;
  media_type?: string;
  artists?: Array<{ name?: string }>;
  album?: { name?: string } | null;
  duration?: number;
  image?: MAImage | null;
  metadata?: { images?: MAImage[] | null } | null;
}

export interface MAImage {
  path: string;
  provider?: string;
  remotely_accessible?: boolean;
}

/** Результат поиска по медиатеке (music/search). */
export interface MASearchResults {
  tracks: MAMediaItem[];
  artists: MAMediaItem[];
  albums: MAMediaItem[];
  playlists: MAMediaItem[];
}

/** Музыкальный источник (провайдер): Звук, локальная фонотека и т.п. */
export interface MAProvider {
  instance_id: string;
  domain: string;
  name: string;
  /** 'music' | 'player' | 'metadata' | 'plugin' */
  type?: string;
  available?: boolean;
}

/** Сырое сообщение из WebSocket Music Assistant. */
export interface MAMessage {
  message_id?: string;
  result?: unknown;
  partial?: boolean;
  error_code?: string | number;
  details?: string;
  /** Для событий — тип события (player_updated, queue_updated, ...). */
  event?: string;
  object_id?: string;
  data?: unknown;
  /** Поля hello-сообщения. */
  server_id?: string;
  server_version?: string;
}
