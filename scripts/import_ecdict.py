"""Import ECDICT CSV into words / books / book_words tables.

Usage:
    python scripts/import_ecdict.py                         # default: data/ecdict.csv
    python scripts/import_ecdict.py /path/to/ecdict.csv     # custom path

Run from backend/ directory.
"""

import csv
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text as sa_text
from app.database import SessionLocal, engine, Base

TAG_BOOK_MAP = {
    "zk":    ("zk",    "中考核心词汇"),
    "gk":    ("gk",    "高考核心词汇"),
    "cet4":  ("cet4",  "大学英语四级"),
    "cet6":  ("cet6",  "大学英语六级"),
    "ky":    ("ky",    "考研英语词汇"),
    "toefl": ("toefl", "托福核心词汇"),
    "ielts": ("ielts", "雅思核心词汇"),
    "gre":   ("gre",   "GRE 核心词汇"),
}

BATCH_SIZE = 500


def safe_int(val: str) -> int | None:
    if not val or not val.strip():
        return None
    try:
        return int(val)
    except ValueError:
        return None


def clean_text(val: str | None) -> str | None:
    if not val:
        return None
    val = val.strip()
    if "\\n" in val:
        lines = [line.strip() for line in val.split("\\n") if line.strip()]
        val = "; ".join(lines)
    return val or None


def normalize_phonetic(raw: str | None) -> str | None:
    if not raw or not raw.strip():
        return None
    p = raw.strip()
    if p and not p.startswith("/"):
        p = "/" + p + "/"
    return p


def normalize_translation(raw: str | None) -> str | None:
    if not raw:
        return None
    raw = raw.strip()
    lines = [line.strip() for line in raw.split("\\n") if line.strip()]
    return "; ".join(lines) if lines else None


def import_ecdict(csv_path: str):
    #Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.execute(sa_text("SELECT COUNT(*) FROM words")).scalar()
        if existing and existing > 0:
            print(f"words 表已有 {existing} 条记录，跳过导入。如需重新导入请先清空数据库。")
            return
    finally:
        db.close()

    # ── Phase 1: 逐批导入词条 ──
    print(f"正在读取 {csv_path} ...")
    t0 = time.time()
    row_count = 0
    batch: list[dict] = []

    from app.models import Word

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            word_text = row.get("word", "").strip()
            if not word_text:
                continue

            row_count += 1
            batch.append({
                "word":        word_text,
                "phonetic":    normalize_phonetic(row.get("phonetic", "")),
                "definition":  clean_text(row.get("definition", "")),
                "translation": normalize_translation(row.get("translation", "")),
                "pos":         clean_text(row.get("pos", "")),
                "collins":     safe_int(row.get("collins", "")),
                "oxford":      safe_int(row.get("oxford", "")),
                "tag":         clean_text(row.get("tag", "")),
                "bnc":         safe_int(row.get("bnc", "")),
                "frq":         safe_int(row.get("frq", "")),
                "exchange":    clean_text(row.get("exchange", "")),
            })

            if len(batch) >= BATCH_SIZE:
                _flush_and_commit(Word, batch)
                batch = []
                print(f"  已写入 {row_count} 条词条...", end="\r")

        if batch:
            _flush_and_commit(Word, batch)
            batch = []

    t1 = time.time()
    print(f"\n词条导入完成：共 {row_count} 条，耗时 {t1 - t0:.1f}s")

    # ── Phase 2: 逐标签生成词书 ──
    print("正在解析标签，生成词书...")

    from app.models import Book, BookWord

    for tag_key, (book_name, display_name) in TAG_BOOK_MAP.items():
        db = SessionLocal()
        try:
            like_pattern = f"%{tag_key}%"
            count = db.execute(
                sa_text("SELECT COUNT(*) FROM words WHERE tag LIKE :p"),
                {"p": like_pattern},
            ).scalar() or 0

            if count == 0:
                print(f"  {display_name}: 无词条，跳过")
                continue

            book = Book(name=book_name, display_name=display_name, total_words=0)
            db.add(book)
            db.flush()
            book_id = book.id

            offset = 0
            page_size = BATCH_SIZE
            matched = 0

            while True:
                rows = db.execute(
                    sa_text(
                        "SELECT id, tag FROM words WHERE tag LIKE :p "
                        "ORDER BY id LIMIT :limit OFFSET :offset"
                    ),
                    {"p": like_pattern, "limit": page_size, "offset": offset},
                ).fetchall()

                if not rows:
                    break

                bw_batch: list[dict] = []
                for wid, tags_str in rows:
                    tags = [t.strip().lower() for t in tags_str.split()]
                    if tag_key in tags:
                        bw_batch.append({
                            "book_id": book_id,
                            "word_id": wid,
                            "order_index": matched,
                        })
                        matched += 1

                if bw_batch:
                    db.execute(BookWord.__table__.insert(), bw_batch)
                    db.flush()

                offset += page_size

            book.total_words = matched
            db.commit()
            print(f"  {display_name}: {matched} 词")

        except Exception as e:
            db.rollback()
            print(f"  {display_name} 导入失败: {e}")
            raise
        finally:
            db.close()

    t2 = time.time()
    print(f"\n全部导入完成，总耗时 {t2 - t0:.1f}s")


def _flush_and_commit(model, rows: list[dict]):
    db = SessionLocal()
    try:
        db.execute(model.__table__.insert(), rows)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    csv_file = sys.argv[1] if len(sys.argv) > 1 else str(
        Path(__file__).resolve().parent.parent / "data" / "ecdict.csv"
    )
    import_ecdict(csv_file)
