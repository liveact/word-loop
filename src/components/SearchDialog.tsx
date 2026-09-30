import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search, Volume2, X } from "lucide-react";
import type { WordEntry } from "../types";
import type { SearchItem } from "../lib/search";
import { useAudio } from "../hooks/useAudio";

const MAX_RESULTS = 60;

export interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  /** Searchable entries; null with loading=false means the source failed. */
  items: SearchItem[] | null;
  loading?: boolean;
}

interface Result {
  item: SearchItem;
  rank: number; // 0 = word prefix, 1 = word contains, 2 = translation contains
}

/** Pure lookup overlay: searching never moves the browse card or progress. */
export default function SearchDialog({
  open,
  onClose,
  items,
  loading = false,
}: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { speak } = useAudio();

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setSelected(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q || !items || items.length === 0) return [];
    const list: Result[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      const word = item.entry[0].toLowerCase();
      const trans = item.entry[2].toLowerCase();
      let rank = -1;
      if (word.startsWith(q)) rank = 0;
      else if (word.includes(q)) rank = 1;
      else if (trans.includes(q)) rank = 2;
      if (rank >= 0) list.push({ item, rank });
    }
    list.sort(
      (a, b) => a.rank - b.rank || a.item.entry[0].length - b.item.entry[0].length
    );
    return list.slice(0, MAX_RESULTS);
  }, [query, items]);

  useEffect(() => {
    setCursor(0);
    setSelected(null); // typing always returns to the result list
  }, [query]);

  if (!open) return null;

  function handleKeyDown(e: React.KeyboardEvent) {
    // keep page-level shortcuts (space / arrows) out while searching
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Enter toggles: list -> detail -> list
      if (selected) setSelected(null);
      else {
        const r = results[cursor];
        if (r) setSelected(r.item);
      }
    }
  }

  const snippet = (entry: WordEntry) => {
    const first = entry[2]?.split("\n")[0] ?? "";
    return first.length > 42 ? `${first.slice(0, 42)}…` : first;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10dvh] px-4
        bg-black/30 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface border border-line rounded-[20px] overflow-hidden anim-fade-up
          shadow-[0_24px_64px_-20px_color-mix(in_oklab,var(--accent)_30%,transparent),0_4px_16px_-6px_color-mix(in_oklab,var(--accent)_18%,transparent)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-line">
          <Search className="h-4 w-4 text-ink-mute shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索单词或中文释义…"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 py-4 bg-transparent outline-none text-base text-ink placeholder:text-ink-mute"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="清空"
              className="p-1.5 rounded-lg text-ink-mute hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="max-h-[62dvh] overflow-y-auto">
          {selected ? (
            <WordDetail
              entry={selected.entry}
              book={selected.book}
              onBack={() => setSelected(null)}
              onSpeak={speak}
            />
          ) : loading ? (
            <p className="px-4 py-6 text-sm text-ink-mute text-center">
              正在加载全部词书…
            </p>
          ) : !items ? (
            <p className="px-4 py-6 text-sm text-ink-mute text-center">
              词库加载失败，关闭后重试
            </p>
          ) : query.trim() === "" ? (
            <p className="px-4 py-6 text-sm text-ink-mute text-center">
              输入英文单词或中文释义关键词
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-mute text-center">
              没有匹配的单词
            </p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={`${r.item.book ?? ""}:${r.item.entry[0]}`}>
                  <button
                    onClick={() => setSelected(r.item)}
                    onMouseEnter={() => setCursor(results.indexOf(r))}
                    className={`w-full flex items-baseline justify-between gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors ${
                      results[cursor] === r ? "bg-accent-soft" : ""
                    }`}
                  >
                    <span className="flex items-baseline gap-2 min-w-0 shrink-0">
                      <span className="font-display text-lg leading-snug">
                        {r.item.entry[0]}
                      </span>
                      {r.item.entry[1] && (
                        <span className="text-xs text-ink-mute">
                          {r.item.entry[1]}
                        </span>
                      )}
                      {r.item.book && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-2 text-ink-mute whitespace-nowrap">
                          {r.item.book}
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-ink-soft truncate">
                      {snippet(r.item.entry)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!selected && results.length >= MAX_RESULTS && (
          <p className="px-4 py-2 text-xs text-ink-mute border-t border-line">
            仅显示前 {MAX_RESULTS} 条，继续输入可缩小范围
          </p>
        )}
      </div>
    </div>
  );
}

function WordDetail({
  entry,
  book,
  onBack,
  onSpeak,
}: {
  entry: WordEntry;
  book?: string;
  onBack: () => void;
  onSpeak: (word: string) => void;
}) {
  const meanings = entry[2]
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="px-6 py-6 text-center">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs font-semibold text-ink-mute hover:text-accent transition-colors cursor-pointer mb-4"
      >
        <ArrowLeft className="h-3 w-3" />
        返回结果列表
      </button>

      <h2 className="font-display font-medium text-4xl sm:text-5xl tracking-tight leading-[1.1] select-all break-words pb-1">
        {entry[0]}
      </h2>

      <div className="flex items-center justify-center gap-3 mt-3">
        {entry[1] && (
          <span className="text-ink-soft text-base">{entry[1]}</span>
        )}
        <button
          onClick={() => onSpeak(entry[0])}
          aria-label={`朗读 ${entry[0]}`}
          className="p-2 rounded-xl bg-accent text-on-accent hover:bg-accent-strong
            transition-all cursor-pointer active:scale-95"
        >
          <Volume2 className="h-4 w-4" />
        </button>
      </div>

      {book && <p className="text-xs text-ink-mute mt-2">{book}</p>}

      <div className="mt-5 pt-4 border-t border-line">
        {meanings.length > 0 ? (
          <div className="space-y-2 max-w-md mx-auto">
            {meanings.map((line, i) => (
              <p key={i} className="text-base leading-relaxed text-ink">
                {line}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-ink-mute">暂无释义</p>
        )}
      </div>
    </div>
  );
}
