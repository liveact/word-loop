from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Book, Round, UserProfile
from app.models.session import Session as SessionModel
from app.models.review import Review as ReviewModel
from app.schemas.dashboard import (
    ActiveRoundInfo,
    BookInfo,
    DashboardOut,
    RecentSessionInfo,
    UnfinishedInfo,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])



@router.get("", response_model=DashboardOut)
def get_dashboard(book_id: int | None = None, db: Session = Depends(get_db)):
    if book_id:
        book = db.query(Book).filter(Book.id == book_id).first()
    else:
        profile = db.query(UserProfile).filter(UserProfile.id == 1).first()
        if profile and profile.active_book_id:
            book = db.query(Book).filter(Book.id == profile.active_book_id).first()
        else:
            book = None
    if not book:
        return DashboardOut()

    book_info = BookInfo.model_validate(book)

    # Count completed rounds (stars)
    stars = (
        db.query(Round)
        .filter(Round.book_id == book.id, Round.status == "completed")
        .count()
    )

    # Get active round
    active_round = (
        db.query(Round)
        .filter(Round.book_id == book.id, Round.status == "active")
        .first()
    )

    active_round_info = None
    unfinished = None
    recent_sessions = []

    if active_round:
        active_round_info = ActiveRoundInfo(
            id=active_round.id,
            round_number=active_round.round_number,
            total_words=active_round.total_words,
            current_position=active_round.current_position,
        )

        # Check unfinished state (priority order)
        # 1. in_progress review
        in_progress_review = (
            db.query(ReviewModel)
            .join(SessionModel, ReviewModel.session_id == SessionModel.id)
            .filter(
                SessionModel.round_id == active_round.id,
                ReviewModel.status == "in_progress",
            )
            .first()
        )
        if in_progress_review:
            review_session = db.query(SessionModel).filter(SessionModel.id == in_progress_review.session_id).first()
            unfinished = UnfinishedInfo(
                type="resume_review",
                session_id=in_progress_review.session_id,
                review_id=in_progress_review.id,
                session_started_at=review_session.started_at if review_session else None,
                session_word_count=review_session.word_count if review_session else 0,
                session_current_index=review_session.current_index if review_session else 0,
                review_current_index=in_progress_review.current_index,
                review_total_count=in_progress_review.total_count,
            )
        else:
            # 2. learn_completed session (needs review)
            learn_completed_session = (
                db.query(SessionModel)
                .filter(
                    SessionModel.round_id == active_round.id,
                    SessionModel.status == "learn_completed",
                )
                .first()
            )
            if learn_completed_session:
                unfinished = UnfinishedInfo(
                    type="start_review",
                    session_id=learn_completed_session.id,
                    session_started_at=learn_completed_session.started_at,
                    session_word_count=learn_completed_session.word_count,
                    session_current_index=learn_completed_session.current_index,
                )
            else:
                # 3. learning session (needs to continue)
                learning_session = (
                    db.query(SessionModel)
                    .filter(
                        SessionModel.round_id == active_round.id,
                        SessionModel.status == "learning",
                    )
                    .first()
                )
                if learning_session:
                    unfinished = UnfinishedInfo(
                        type="resume_learning",
                        session_id=learning_session.id,
                        session_started_at=learning_session.started_at,
                        session_word_count=learning_session.word_count,
                        session_current_index=learning_session.current_index,
                    )

        # Recent sessions (review_completed)
        recent = (
            db.query(SessionModel)
            .filter(
                SessionModel.round_id == active_round.id,
                SessionModel.status == "review_completed",
            )
            .order_by(SessionModel.learn_completed_at.desc())
            .all()
        )
        recent_sessions = []
        for s in recent:
            review_count = (
                db.query(ReviewModel)
                .filter(ReviewModel.session_id == s.id)
                .count()
            )
            recent_sessions.append(RecentSessionInfo(
                id=s.id,
                word_count=s.word_count,
                status=s.status,
                review_count=review_count,
                started_at=s.started_at,
                learn_completed_at=s.learn_completed_at,
            ))

    return DashboardOut(
        book=book_info,
        stars=stars,
        active_round=active_round_info,
        unfinished=unfinished,
        recent_sessions=recent_sessions,
    )
