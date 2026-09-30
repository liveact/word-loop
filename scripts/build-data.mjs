/**
 * Build word book data from ECDICT CSV into public/data/.
 *
 * Usage:
 *   node scripts/build-data.mjs [--csv <path>] [--refresh]
 *
 * With no --csv, the ECDICT csv is downloaded once from GitHub
 * (skywind3000/ECDICT) into .cache/ and reused afterwards.
 * --refresh forces a re-download to pick up upstream updates.
 */
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { createReadStream } from "node:fs";
import { rm, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const ECDICT_URL =
  "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv";
const CACHE_PATH = resolve(ROOT, ".cache", "ecdict.csv");
const MIN_VALID_BYTES = 10 * 1024 * 1024; // html error pages are far smaller

const BOOKS = [
  { tag: "zk", name: "zk", displayName: "中考核心词汇" },
  { tag: "gk", name: "gk", displayName: "高考核心词汇" },
  { tag: "cet4", name: "cet4", displayName: "大学英语四级" },
  { tag: "cet6", name: "cet6", displayName: "大学英语六级" },
  { tag: "ky", name: "ky", displayName: "考研英语词汇" },
  { tag: "toefl", name: "toefl", displayName: "托福核心词汇" },
  { tag: "ielts", name: "ielts", displayName: "雅思核心词汇" },
  { tag: "gre", name: "gre", displayName: "GRE 核心词汇" },
];

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function downloadCsv(url, dest) {
  console.log(`Downloading ${url} ...`);
  const t0 = Date.now();
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`下载 ECDICT 失败: HTTP ${res.status}`);
  }
  const total = Number(res.headers.get("content-length")) || 0;
  let received = 0;
  await pipeline(
    Readable.fromWeb(res.body),
    async function* logProgress(source) {
      for await (const chunk of source) {
        received += chunk.length;
        if (total > 0) {
          process.stdout.write(
            `\r  ${((received / 1048576) | 0)} / ${((total / 1048576) | 0)} MB`
          );
        }
        yield chunk;
      }
    },
    createWriteStream(dest)
  );
  process.stdout.write(
    `\r  downloaded ${((received / 1048576) | 0)} MB in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`
  );

  if (received < MIN_VALID_BYTES) {
    await rm(dest, { force: true });
    throw new Error(
      `下载内容仅 ${received} 字节，疑似不完整（GitHub 限流或网络问题），已丢弃。稍后重试或用 --csv 指定本地文件。`
    );
  }
}

/** Resolve the csv to use: explicit --csv wins; otherwise cache-or-download. */
async function resolveCsvPath() {
  const explicit = argValue("--csv");
  if (explicit) return resolve(explicit);

  const refresh = process.argv.includes("--refresh");
  if (refresh || !existsSync(CACHE_PATH)) {
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    await downloadCsv(ECDICT_URL, CACHE_PATH);
  } else {
    console.log(`Using cached ECDICT: ${CACHE_PATH} (--refresh to update)`);
  }
  return CACHE_PATH;
}

const CSV_PATH =
  argValue("--csv") ?? resolve(ROOT, "..", "word-loop", "data", "ecdict.csv");
const OUT_DIR = resolve(ROOT, "public", "data");

/** Minimal RFC4180 CSV field parser: quotes, escaped quotes, commas, newlines. */
function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function normalizePhonetic(raw) {
  const p = (raw ?? "").trim();
  if (!p) return "";
  return p.startsWith("/") ? p : `/${p}/`;
}

function normalizeTranslation(raw) {
  const t = (raw ?? "").trim();
  if (!t) return "";
  return t
    .split("\\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

async function main() {
  const csvPath = await resolveCsvPath();
  console.log(`Reading ${csvPath} ...`);
  const t0 = Date.now();

  const bookWords = new Map(BOOKS.map((b) => [b.tag, []]));

  const rl = readline.createInterface({
    input: createReadStream(csvPath, "utf-8"),
    crlfDelay: Infinity,
  });

  let header = null;
  const idx = {};
  let total = 0;

  // Quoted fields may contain newlines, so buffer until quotes balance.
  let pending = null;

  const consume = (line) => {
    if (header === null) {
      header = parseCsvLine(line);
      for (const [i, name] of header.entries()) idx[name] = i;
      return;
    }
    const cols = parseCsvLine(line);
    const word = (cols[idx.word] ?? "").trim();
    if (!word) return;
    total++;

    const tags = (cols[idx.tag] ?? "").toLowerCase().split(/\s+/);
    const phonetic = normalizePhonetic(cols[idx.phonetic]);
    const translation = normalizeTranslation(cols[idx.translation]);
    const entry = [word, phonetic, translation];

    for (const b of BOOKS) {
      if (tags.includes(b.tag)) bookWords.get(b.tag).push(entry);
    }
  };

  for await (let line of rl) {
    if (pending !== null) {
      line = pending + "\n" + line;
      pending = null;
    }
    const quotes = (line.match(/"/g) ?? []).length;
    if (quotes % 2 === 1) {
      pending = line; // unbalanced quote: field contains a newline
    } else {
      consume(line);
    }
  }
  if (pending !== null) consume(pending);

  await mkdir(OUT_DIR, { recursive: true });

  const manifest = {
    version: 1,
    books: [],
  };

  for (const b of BOOKS) {
    const words = bookWords.get(b.tag);
    if (words.length === 0) {
      console.log(`  ${b.displayName}: 0 words, skipped`);
      continue;
    }
    const file = `${b.name}.json`;
    const dest = resolve(OUT_DIR, file);
    await writeFile(dest, JSON.stringify(words), "utf-8");
    // guard against truncated writes (e.g. process killed mid-build)
    const { stat } = await import("node:fs/promises");
    const size = (await stat(dest)).size;
    if (size < 2) {
      throw new Error(`${file} 写入后为空 (${size} 字节)，构建异常终止`);
    }
    manifest.books.push({
      file,
      name: b.name,
      displayName: b.displayName,
      count: words.length,
    });
    console.log(`  ${b.displayName}: ${words.length} words -> ${file}`);
  }

  await writeFile(
    resolve(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest),
    "utf-8"
  );

  console.log(
    `Done: ${total} rows scanned in ${((Date.now() - t0) / 1000).toFixed(1)}s, manifest + ${manifest.books.length} books written to public/data/`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
