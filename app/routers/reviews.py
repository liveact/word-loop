import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Word
from app.models.review import Review as ReviewModel
from app.models.session import Session as SessionModel
from app.schemas.book import WordOut
from app.schemas.review import CreateReviewRequest, ReviewOut, ReviewProgressUpdate
from app.services import review_service

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("", response_model=ReviewOut)
def create_review(req: CreateReviewRequest, db: Session = Depends(get_db)):
    session = db.query(SessionModel).filter(SessionModel.id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status not in ("learn_completed", "review_completed"):
        raise HTTPException(
            status_code=400,
            detail="Session must be in learn_completed or review_completed state",
        )

    existing_review = (
        db.query(ReviewModel)
        .filter(
            ReviewModel.session_id == req.session_id,
            ReviewModel.status == "in_progress",
        )
        .first()
    )
    if existing_review:
        return existing_review

    review = review_service.create_review(req.session_id, db)
    db.commit()
    return review


@router.get("/{review_id}/words")
def get_review_words(review_id: int, db: Session = Depends(get_db)):
    review = db.query(ReviewModel).filter(ReviewModel.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    order = json.loads(review.order_json)
    words = db.query(Word).filter(Word.id.in_(order)).all()
    word_map = {w.id: w for w in words}
    ordered_words = [word_map[wid] for wid in order if wid in word_map]

    return {
        "words": [WordOut.model_validate(w) for w in ordered_words],
        "total": review.total_count,
    }


@router.patch("/{review_id}/progress")
def update_review_progress(
    review_id: int,
    req: ReviewProgressUpdate,
    db: Session = Depends(get_db),
):
    review = db.query(ReviewModel).filter(ReviewModel.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.status != "in_progress":
        raise HTTPException(status_code=400, detail="Review is not in progress")

    review_service.update_progress(review_id, req.current_index, db)
    db.commit()
    return {"ok": True}


@router.put("/{review_id}/complete")
def complete_review(
    review_id: int,
    req: ReviewProgressUpdate,
    db: Session = Depends(get_db),
):
    review = db.query(ReviewModel).filter(ReviewModel.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.status != "in_progress":
        raise HTTPException(status_code=400, detail="Review is not in progress")

    result_review, round_completed = review_service.complete_review(
        review_id, req.current_index, db
    )
    db.commit()
    return {
        "review": ReviewOut.model_validate(result_review),
        "round_completed": round_completed,
    }


@router.get("/{review_id}", response_model=ReviewOut)
def get_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(ReviewModel).filter(ReviewModel.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review
