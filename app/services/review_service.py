import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session as DBSession

from app.models.review import Review
from app.models.session import Session
from app.models.round import Round
from app.utils.shuffle import fisher_yates_shuffle


def create_review(session_id: int, db: DBSession) -> Review:
    """Create a new review for a session, shuffling its word IDs."""
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        return None

    rnd = db.query(Round).filter(Round.id == session.round_id).first()
    order = json.loads(rnd.order_json)

    # Get word IDs for this session's range
    end = session.end_position if session.end_position else rnd.current_position
    word_ids = order[session.start_position:end]

    shuffled = fisher_yates_shuffle(word_ids)

    review = Review(
        session_id=session_id,
        order_json=json.dumps(shuffled),
        total_count=len(shuffled),
        current_index=0,
        status="in_progress",
        started_at=datetime.now(timezone.utc),
    )
    db.add(review)
    db.flush()
    return review


def update_progress(review_id: int, current_index: int, db: DBSession) -> Review:
    review = db.query(Review).filter(Review.id == review_id).first()
    if review and review.status == "in_progress":
        review.current_index = current_index
        db.flush()
    return review


def complete_review(review_id: int, current_index: int, db: DBSession) -> tuple[Review, bool]:
    """Complete a review. Returns (review, round_completed)."""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        return None, False

    review.status = "completed"
    review.current_index = current_index
    review.completed_at = datetime.now(timezone.utc)
    db.flush()

    # Update session status if this is the first completed review
    session = db.query(Session).filter(Session.id == review.session_id).first()
    if session and session.status == "learn_completed":
        session.status = "review_completed"
        db.flush()

    # Check if round is complete
    round_completed = False
    if session:
        rnd = db.query(Round).filter(Round.id == session.round_id).first()
        if rnd and session.status == "review_completed":
            # Check if all positions in the round have been covered
            # i.e., the last session's end_position equals total_words
            if session.end_position and session.end_position >= rnd.total_words:
                # Check all sessions in this round are review_completed
                all_sessions = (
                    db.query(Session)
                    .filter(Session.round_id == rnd.id)
                    .all()
                )
                all_reviewed = all(s.status == "review_completed" for s in all_sessions)
                if all_reviewed and rnd.current_position >= rnd.total_words:
                    rnd.status = "completed"
                    rnd.completed_at = datetime.now(timezone.utc)
                    round_completed = True
                    db.flush()

    return review, round_completed
