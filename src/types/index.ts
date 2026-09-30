export interface BookMeta {
  file: string;
  name: string;
  displayName: string;
  count: number;
}

export interface Manifest {
  version: number;
  books: BookMeta[];
}

/** [word, phonetic, translation] as stored in public/data/*.json */
export type WordEntry = [string, string, string];
