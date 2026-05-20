/**
 * Данные радиостанций Zaycev FM.
 *
 * 17 жанровых каналов, проигрываются через прямые HTTP-MP3 стримы с
 * abs.zaycev.fm. Тап на канал → media_player.play_media с этим URL. Работает
 * на любом плеере, принимающем произвольный HTTP-mp3: Yandex.Station (через
 * AlexxIT/YandexStation), DLNA, AirPlay, Cast.
 *
 * Чистый data-модуль без React — чтобы радио-секция попапа плеера
 * (MediaPlayerSheet) могла импортировать каналы без лишних зависимостей.
 */

export interface ZaycevChannel {
  id: string;
  name: string;
  emoji: string;
}

export type ZaycevBitrate = '48k' | '128k' | '256k';

export const ZAYCEV_CHANNELS: ZaycevChannel[] = [
  { id: 'pop', name: 'Pop', emoji: '🎤' },
  { id: 'rock', name: 'Rock', emoji: '🎸' },
  { id: 'club', name: 'Club', emoji: '🪩' },
  { id: 'disco', name: 'Disco', emoji: '🕺' },
  { id: 'rurock', name: 'РуРок', emoji: '🎸' },
  { id: 'shanson', name: 'Шансон', emoji: '🚬' },
  { id: 'rus', name: 'Русское', emoji: '🇷🇺' },
  { id: 'rnb', name: 'R&B', emoji: '🎵' },
  { id: 'relax', name: 'Relax', emoji: '🌊' },
  { id: 'zaychata', name: 'Зайчата', emoji: '🐰' },
  { id: 'kpop', name: 'K-Pop', emoji: '🎎' },
  { id: 'rap', name: 'Рэп', emoji: '🎤' },
  { id: 'metal', name: 'Metal', emoji: '🤘' },
  { id: 'bass', name: 'Bass', emoji: '🔊' },
  { id: 'love', name: 'Love', emoji: '❤️' },
  { id: 'folk', name: 'Folk', emoji: '🪕' },
  { id: 'classic', name: 'Classic', emoji: '🎻' },
];

const STREAM_BASE = 'https://abs.zaycev.fm';

/** URL прямого HTTP-MP3 стрима канала, например abs.zaycev.fm/pop128k. */
export function zaycevStreamUrl(
  channelId: string,
  bitrate: ZaycevBitrate = '128k',
): string {
  return `${STREAM_BASE}/${channelId}${bitrate}`;
}
