import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Word
from app.models.session import Session as SessionModel
from app.models.review import Review as ReviewModel
from app.schemas.book import WordOut
from app.schemas.session import CompleteLearningRequest, ProgressUpdate, SessionOut
from app.schemas.review import ReviewOut
from app.services import session_service

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("/{session_id}/words")
def get_session_words(
    session_id: int,
    offset: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    from app.models import Round

    rnd = db.query(Round).filter(Round.id == session.round_id).first()
    order = json.loads(rnd.order_json)

    session_word_ids = order[session.start_position:]
    if session.end_position is not None:
        session_word_ids = order[session.start_position:session.end_position]

    total = len(session_word_ids)
    page_ids = session_word_ids[offset:] if limit == 0 else session_word_ids[offset:offset + limit]

    words = db.query(Word).filter(Word.id.in_(page_ids)).all()
    word_map = {w.id: w for w in words}
    ordered_words = [word_map[wid] for wid in page_ids if wid in word_map]

    return {
        "words": [WordOut.model_validate(w) for w in ordered_words],
        "has_more": False if limit == 0 else offset + limit < total,
        "total": total,
    }


@router.patch("/{session_id}/progress")
def update_session_progress(
    session_id: int,
    req: ProgressUpdate,
    db: Session = Depends(get_db),
):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "learning":
        raise HTTPException(status_code=400, detail="Session is not in learning state")

    session_service.update_progress(session_id, req.current_index, db)
    db.commit()
    return {"ok": True}


@router.put("/{session_id}/complete-learn", response_model=SessionOut)
def complete_learn(
    session_id: int,
    req: CompleteLearningRequest,
    db: Session = Depends(get_db),
):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "learning":
        raise HTTPException(status_code=400, detail="Session is not in learning state")

    result = session_service.complete_learn(
        session_id, req.end_position, req.word_count, req.current_index, db
    )
    db.commit()
    return result


@router.get("/{session_id}/reviews", response_model=list[ReviewOut])
def get_session_reviews(
    session_id: int,
    db: Session = Depends(get_db),
):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    reviews = (
        db.query(ReviewModel)
        .filter(ReviewModel.session_id == session_id)
        .order_by(ReviewModel.started_at.desc())
        .all()
    )
    return reviews


@router.get("/{session_id}", response_model=SessionOut)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
