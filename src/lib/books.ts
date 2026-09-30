import type { BookMeta, Manifest, WordEntry } from "../types";

let manifestPromise: Promise<Manifest> | null = null;
const wordsCache = new Map<string, Promise<WordEntry[]>>();

export function loadManifest(): Promise<Manifest> {
  if (!manifestPromise) {
    manifestPromise = fetch("/data/manifest.json").then((res) => {
      if (!res.ok) throw new Error(`加载词书目录失败 (${res.status})`);
      return res.json() as Promise<Manifest>;
    });
  }
  return manifestPromise;
}

export function loadWords(meta: BookMeta): Promise<WordEntry[]> {
  let p = wordsCache.get(meta.name);
  if (!p) {
    p = fetch(`/data/${meta.file}`).then(async (res) => {
      if (!res.ok) throw new Error(`加载词书失败 (${res.status})`);
      try {
        return (await res.json()) as WordEntry[];
      } catch {
        throw new Error(
          `词书数据损坏 (${meta.file})，请重新运行 npm run build:data`
        );
      }
    });
    wordsCache.set(meta.name, p);
  }
  return p;
}

const POS_PREFIX = "wordloop:pos";
const LAST_BOOK_KEY = "wordloop:last-book";

export function readPosition(book: string, total: number): number {
  try {
    const raw = localStorage.getItem(`${POS_PREFIX}:${book}`);
    const n = raw === null ? Number.NaN : Number(raw);
    if (Number.isInteger(n) && n >= 0 && n < total) return n;
  } catch {
    /* storage unavailable */
  }
  return 0;
}

export function savePosition(book: string, index: number): void {
  try {
    localStorage.setItem(`${POS_PREFIX}:${book}`, String(index));
  } catch {
    /* storage unavailable */
  }
}

export function readLastBook(): string | null {
  try {
    return localStorage.getItem(LAST_BOOK_KEY);
  } catch {
    return null;
  }
}

export function saveLastBook(name: string): void {
  try {
    localStorage.setItem(LAST_BOOK_KEY, name);
  } catch {
    /* storage unavailable */
  }
}
