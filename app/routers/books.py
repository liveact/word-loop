from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Book
from app.schemas.book import BookOut

router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("", response_model=list[BookOut])
def get_books(db: Session = Depends(get_db)):
    return db.query(Book).all()
