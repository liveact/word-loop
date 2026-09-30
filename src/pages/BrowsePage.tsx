import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Search, Undo2, Volume2 } from "lucide-react";
import { useKeyboard } from "../hooks/useKeyboard";
import { useAudio } from "../hooks/useAudio";
import SearchDialog from "../components/SearchDialog";
import type { SearchItem } from "../lib/search";
import {
  loadManifest,
  loadWords,
  readPosition,
  saveLastBook,
  savePosition,
} from "../lib/books";
import type { BookMeta, WordEntry } from "../types";

export default function BrowsePage() {
  const { book = "" } = useParams<{ book: string }>();
  const [meta, setMeta] = useState<BookMeta | null>(null);
  const [words, setWords] = useState<WordEntry[] | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { speak } = useAudio();

  useEffect(() => {
    let cancelled = false;
    setMeta(null);
    setWords(null);
    setError(null);
    setNotFound(false);

    loadManifest()
      .then((m) => {
        if (cancelled) return;
        const found = m.books.find((b) => b.name === book);
        if (!found) {
          setNotFound(true);
          return;
        }
        setMeta(found);
        return loadWords(found).then((w) => {
          if (cancelled) return;
          setWords(w);
          setIndex(readPosition(found.name, w.length));
          saveLastBook(found.name);
        });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      });
    return () => {
      cancelled = true;
    };
  }, [book]);

  const go = useCallback(
    (delta: 1 | -1) => {
      setWords((ws) => {
        if (!ws || ws.length === 0) return ws;
        setIndex((i) => {
          const next = (i + delta + ws.length) % ws.length;
          savePosition(book, next);
          return next;
        });
        return ws;
      });
    },
    [book]
  );

  const speakCurrent = useCallback(() => {
    if (words && words[index]) speak(words[index][0]);
  }, [words, index, speak]);

  useKeyboard({
    onPrev: () => go(-1),
    onNext: () => go(1),
    onSpeak: speakCurrent,
  });

  const entry = words?.[index];
  const searchItems = useMemo<SearchItem[]>(
    () => (words ?? []).map((w) => ({ entry: w })),
    [words]
  );
  const meanings = useMemo(
    () =>
      entry
        ? entry[2]
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    [entry]
  );

  const progress =
    words && words.length > 0 ? ((index + 1) / words.length) * 100 : 0;
  const isLast = !!words && words.length > 0 && index === words.length - 1;

  // keep the page itself never-scrolled; long meanings scroll inside the card
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [index]);

  // "/" opens search, like every other word tool
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (notFound) {
    return (
      <CenterMessage>
        <p>没有找到这本书。</p>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl bg-accent text-on-accent font-semibold hover:bg-accent-strong transition-colors"
        >
          回到书架
        </Link>
      </CenterMessage>
    );
  }

  if (error) {
    return (
      <CenterMessage>
        <p className="text-ink-soft">{error}</p>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl bg-accent text-on-accent font-semibold hover:bg-accent-strong transition-colors"
        >
          回到书架
        </Link>
      </CenterMessage>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full max-w-2xl mx-auto">
      {/* sub header: back, title, counter */}
      <div className="flex items-center justify-between py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mute hover:text-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          书架
        </Link>
        <span className="text-sm font-medium text-ink-soft">
          {meta?.displayName ?? ""}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-mute tabular-nums">
            {words ? `${(index + 1).toLocaleString()} / ${words.length.toLocaleString()}` : ""}
          </span>
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="搜索单词"
            title="搜索 (/)"
            className="p-2 -mr-2 rounded-xl text-ink-mute hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* progress hairline */}
      {/* progress track: min 1% once browsing started, so the fill stays visible */}
      <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${index > 0 ? Math.max(progress, 1) : 0}%` }}
        />
      </div>

      {/* word card */}
      <main className="flex-1 flex flex-col justify-center py-8">
        {entry ? (
          <article
            key={index}
            className="anim-card-in bg-surface border border-line rounded-[20px] card-shadow
              px-6 py-8 sm:px-10 sm:py-10 text-center flex flex-col
              h-[clamp(300px,calc(100dvh-390px),620px)]"
          >
            <div className="shrink-0">
              <h1 className="font-display font-medium text-5xl sm:text-6xl md:text-7xl tracking-tight leading-[1.1] select-all break-words pb-1">
                {entry[0]}
              </h1>

              <div className="flex items-center justify-center gap-3 mt-4">
                {entry[1] && (
                  <span className="text-ink-soft text-base sm:text-lg">
                    {entry[1]}
                  </span>
                )}
                <button
                  onClick={speakCurrent}
                  aria-label={`朗读 ${entry[0]}`}
                  title="朗读 (空格)"
                  className="p-2 rounded-xl bg-accent text-on-accent hover:bg-accent-strong
                    transition-all cursor-pointer active:scale-95"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-line flex-1 min-h-0 flex flex-col overflow-y-auto">
              {meanings.length > 0 ? (
                <div className="space-y-2 max-w-md w-full m-auto">
                  {meanings.map((line, i) => (
                    <p
                      key={i}
                      className="text-base sm:text-lg leading-relaxed text-ink"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-ink-mute m-auto">暂无释义</p>
              )}
            </div>
          </article>
        ) : (
          <div className="bg-surface border border-line rounded-[20px] px-6 py-10 sm:px-10 sm:py-12 text-center">
            <div className="h-12 w-48 mx-auto rounded-lg bg-surface-2 animate-pulse" />
            <div className="h-4 w-24 mx-auto rounded bg-surface-2 animate-pulse mt-5" />
            <div className="h-4 w-2/3 mx-auto rounded bg-surface-2 animate-pulse mt-10" />
          </div>
        )}
      </main>

      {/* controls */}
      <footer className="pb-8 pt-2">
        <div className="flex gap-3">
          <button
            onClick={() => go(-1)}
            disabled={!words || words.length === 0}
            className="flex-1 py-3.5 rounded-xl bg-surface border border-line font-semibold
              hover:bg-surface-2 transition-all cursor-pointer active:scale-[0.98]
              disabled:opacity-40 disabled:pointer-events-none
              inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            上一个
          </button>
          <button
            onClick={() => go(1)}
            disabled={!words || words.length === 0}
            className="flex-1 py-3.5 rounded-xl bg-accent text-on-accent font-semibold
              hover:bg-accent-strong transition-all cursor-pointer active:scale-[0.98]
              disabled:opacity-40 disabled:pointer-events-none
              inline-flex items-center justify-center gap-2"
          >
            {isLast ? (
              <>
                <Undo2 className="h-4 w-4" />
                回到开头
              </>
            ) : (
              <>
                下一个
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-ink-mute mt-4 [@media(pointer:coarse)]:hidden">
          键盘：← → 翻页，空格朗读，/ 搜索
        </p>
      </footer>

      <SearchDialog
        open={searchOpen}
        items={searchItems}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24 text-center anim-fade-up">
      {children}
    </div>
  );
}
