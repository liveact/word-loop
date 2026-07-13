from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Book, UserProfile
from app.schemas.profile import ProfileOut, SetActiveBookRequest

router = APIRouter(prefix="/api/profile", tags=["profile"])


def get_or_create_profile(db: Session) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.id == 1).first()
    if not profile:
        profile = UserProfile(id=1)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("", response_model=ProfileOut)
def get_profile(db: Session = Depends(get_db)):
    profile = get_or_create_profile(db)
    return profile


@router.put("/active-book", response_model=ProfileOut)
def set_active_book(req: SetActiveBookRequest, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == req.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    profile = get_or_create_profile(db)
    profile.active_book_id = req.book_id
    db.commit()
    db.refresh(profile)
    return profile
