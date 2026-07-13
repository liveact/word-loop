import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import BookWord, Round
from app.utils.shuffle import fisher_yates_shuffle


def get_active_round(book_id: int, db: Session) -> Round | None:
    return (
        db.query(Round)
        .filter(Round.book_id == book_id, Round.status == "active")
        .first()
    )


def create_round(book_id: int, db: Session) -> Round:
    active = get_active_round(book_id, db)
    if active:
        active.status = "archived"
        db.flush()

    completed_count = (
        db.query(Round)
        .filter(Round.book_id == book_id, Round.status == "completed")
        .count()
    )

    word_ids = [
        row[0]
        for row in db.query(BookWord.word_id)
        .filter(BookWord.book_id == book_id)
        .order_by(BookWord.order_index)
        .all()
    ]

    shuffled_ids = fisher_yates_shuffle(word_ids)

    new_round = Round(
        book_id=book_id,
        round_number=completed_count + 1,
        order_json=json.dumps(shuffled_ids),
        total_words=len(shuffled_ids),
        current_position=0,
        status="active",
        started_at=datetime.now(timezone.utc),
    )
    db.add(new_round)
    db.flush()
    return new_round


def complete_round(round_id: int, db: Session) -> Round:
    rnd = db.query(Round).filter(Round.id == round_id).first()
    if rnd:
        rnd.status = "completed"
        rnd.completed_at = datetime.now(timezone.utc)
        db.flush()
    return rnd
