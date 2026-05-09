export interface Profile {
  id: string;
  name: string;
  /** Эмодзи или dataURL фотки */
  avatar: string;
  /** SHA-256 хэш PIN. null = без защиты */
  pinHash?: string | null;
  createdAt: number;
  updatedAt: number;
}
