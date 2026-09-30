import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { loadManifest, readLastBook, readPosition } from "../lib/books";
import { loadAllBooks, type SearchItem } from "../lib/search";
import SearchDialog from "../components/SearchDialog";
import type { Manifest } from "../types";

export default function BookshelfPage() {
  const navigate = useNavigate();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [allItems, setAllItems] = useState<SearchItem[] | null>(null);
  const [allLoading, setAllLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadManifest()
      .then((m) => {
        if (!cancelled) setManifest(m);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      });
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  const retry = useCallback(() => {
    setError(null);
    setManifest(null);
    setRetryTick((t) => t + 1);
  }, []);

  const lastBook = readLastBook();

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    if (!allItems && !allLoading && manifest) {
      setAllLoading(true);
      loadAllBooks(manifest)
        .then(setAllItems)
        .catch(() => setAllItems(null))
        .finally(() => setAllLoading(false));
    }
  }, [allItems, allLoading, manifest]);

  // "/" opens search here too
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

  const open = useCallback(
    (name: string) => {
      navigate(`/browse/${name}`);
    },
    [navigate]
  );

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-ink-soft">{error}</p>
        <button
          onClick={retry}
          className="px-5 py-2.5 rounded-xl bg-accent text-on-accent font-semibold hover:bg-accent-strong transition-colors cursor-pointer"
        >
          重试
        </button>
        <p className="text-xs text-ink-mute max-w-xs">
          如果词书数据尚未生成，请在项目目录运行 npm run build:data
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 w-full anim-fade-up">
        <header className="mb-8 md:mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">书架</h1>
            <p className="text-ink-mute mt-2">选一本，安静地翻看单词。</p>
          </div>
          <button
            onClick={openSearch}
            aria-label="搜索单词"
            title="搜索 (/)"
            className="p-2.5 rounded-xl text-ink-mute hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </button>
        </header>

      {manifest ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {manifest.books.map((b) => {
            const pos = readPosition(b.name, b.count);
            const percent = b.count > 0 ? (pos / b.count) * 100 : 0;
            const isLast = lastBook === b.name;
            return (
              <button
                key={b.name}
                onClick={() => open(b.name)}
                className={`group flex flex-col text-left bg-surface border rounded-[20px] p-5 cursor-pointer
                  transition-all duration-300 hover:-translate-y-0.5 hover:card-shadow
                  ${isLast ? "border-accent/60 bg-accent-soft" : "border-line hover:border-accent/40"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold leading-snug">
                    {b.displayName}
                  </h2>
                  <ArrowRight className="h-4 w-4 mt-1 text-ink-mute opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-accent shrink-0" />
                </div>

                <div className="mt-auto pt-5">
                  <p
                    className={`text-sm tabular-nums ${pos > 0 ? "text-accent" : "text-ink-soft"}`}
                  >
                    {b.count.toLocaleString()} 词
                    {pos > 0 && ` · 上次看到第 ${(pos + 1).toLocaleString()} 词`}
                  </p>
                  <div className="mt-3 h-1 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col bg-surface border border-line rounded-[20px] p-5 min-h-[124px]"
            >
              <div className="h-5 w-2/3 rounded bg-surface-2 animate-pulse" />
              <div className="mt-auto pt-5">
                <div className="h-4 w-20 rounded bg-surface-2 animate-pulse" />
                <div className="mt-3 h-1 rounded-full bg-surface-2" />
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* fixed overlay must live outside the animated wrapper: a transform
          animation creates a containing block that would clip it */}
      <SearchDialog
        open={searchOpen}
        items={allItems}
        loading={allLoading}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}