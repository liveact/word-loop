from datetime import datetime, timezone

from sqlalchemy.orm import Session as DBSession

from app.models import Round
from app.models.session import Session


def get_unfinished_session(round_id: int, db: DBSession) -> Session | None:
    """Find an in-progress (learning) session for this round."""
    return (
        db.query(Session)
        .filter(Session.round_id == round_id, Session.status == "learning")
        .first()
    )


def get_learn_completed_session(round_id: int, db: DBSession) -> Session | None:
    """Find a session that finished learning but hasn't been reviewed."""
    return (
        db.query(Session)
        .filter(Session.round_id == round_id, Session.status == "learn_completed")
        .first()
    )


def start_or_resume(round_id: int, db: DBSession) -> Session:
    """If there's an in-progress Session, return it. Otherwise create a new one."""
    existing = get_unfinished_session(round_id, db)
    if existing:
        return existing

    rnd = db.query(Round).filter(Round.id == round_id).first()
    new_session = Session(
        round_id=round_id,
        start_position=rnd.current_position,
        current_index=0,
        status="learning",
        started_at=datetime.now(timezone.utc),
    )
    db.add(new_session)
    db.flush()
    return new_session


def update_progress(session_id: int, current_index: int, db: DBSession) -> Session:
    session = db.query(Session).filter(Session.id == session_id).first()
    if session and session.status == "learning":
        session.current_index = current_index
        db.flush()
    return session


def complete_learn(
    session_id: int,
    end_position: int,
    word_count: int,
    current_index: int,
    db: DBSession,
) -> Session:
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        return None

    session.status = "learn_completed"
    session.end_position = end_position
    session.word_count = word_count
    session.current_index = current_index
    session.learn_completed_at = datetime.now(timezone.utc)
    db.flush()

    # Update Round.current_position
    rnd = db.query(Round).filter(Round.id == session.round_id).first()
    if rnd:
        rnd.current_position = end_position
        db.flush()

    return session
