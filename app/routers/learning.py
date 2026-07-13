from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.session import Session as SessionModel
from app.schemas.session import SessionOut, StartLearningRequest
from app.services import round_service, session_service

router = APIRouter(prefix="/api/learning", tags=["learning"])


@router.post("/start", response_model=SessionOut)
def start_learning(req: StartLearningRequest, db: Session = Depends(get_db)):
    # 1. Check for unfinished session (learning status) across all rounds of this book
    active_round = round_service.get_active_round(req.book_id, db)

    if active_round:
        unfinished = session_service.get_unfinished_session(active_round.id, db)
        if unfinished:
            raise HTTPException(
                status_code=409,
                detail={
                    "type": "resume_learning",
                    "session_id": unfinished.id,
                    "message": "有未完成的学习",
                },
            )

        # Check if there's a learn_completed session without review
        learn_completed = session_service.get_learn_completed_session(active_round.id, db)
        if learn_completed:
            raise HTTPException(
                status_code=409,
                detail={
                    "type": "start_review",
                    "session_id": learn_completed.id,
                    "message": "有未复习的学习",
                },
            )

    # 2. Get or create active round
    if not active_round or active_round.current_position >= active_round.total_words:
        active_round = round_service.create_round(req.book_id, db)

    # 3. Create session
    session = session_service.start_or_resume(active_round.id, db)
    db.commit()
    return session
