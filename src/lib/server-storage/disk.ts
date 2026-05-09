/**
 * Серверное хранилище — JSON-файлы на диске.
 * Используется только в API-routes (никогда в браузере).
 */
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readJson<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, filename), 'utf8');
    return JSON.parse(raw) as T;
  } catch (e: any) {
    if (e.code === 'ENOENT') return fallback;
    throw e;
  }
}

export async function writeJson<T>(filename: string, data: T): Promise<void> {
  await ensureDir();
  const fullPath = path.join(DATA_DIR, filename);
  // Атомарная запись через temp + rename
  const tmp = fullPath + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, fullPath);
}

export async function deleteFile(filename: string): Promise<void> {
  try {
    await fs.unlink(path.join(DATA_DIR, filename));
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
  }
}
