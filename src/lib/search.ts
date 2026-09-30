import type { Manifest, WordEntry } from "../types";
import { loadWords } from "./books";

export interface SearchItem {
  entry: WordEntry;
  book?: string; // display name of the source book (global search)
}

let allItemsPromise: Promise<SearchItem[]> | null = null;

/** Load every book into one flat searchable list (cached in memory). */
export function loadAllBooks(manifest: Manifest): Promise<SearchItem[]> {
  if (!allItemsPromise) {
    allItemsPromise = Promise.all(
      manifest.books.map((b) =>
        loadWords(b).then((ws) =>
          ws.map((entry) => ({ entry, book: b.displayName }))
        )
      )
    )
      .then((perBook) => perBook.flat())
      .catch((err) => {
        allItemsPromise = null; // allow retry on next open
        throw err;
      });
  }
  return allItemsPromise;
}
