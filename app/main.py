from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import SessionLocal
from app.models import Book, UserProfile
from app.routers import books, dashboard, learning, profile, reviews, sessions


def ensure_default_profile():
    db = SessionLocal()
    try:
        existing = db.query(UserProfile).filter(UserProfile.id == 1).first()
        if not existing:
            first_book = db.query(Book).first()
            p = UserProfile(id=1, active_book_id=first_book.id if first_book else None)
            db.add(p)
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(application: FastAPI):
    ensure_default_profile()
    yield


app = FastAPI(title="WordLoop API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(books.router)
app.include_router(dashboard.router)
app.include_router(learning.router)
app.include_router(profile.router)
app.include_router(sessions.router)
app.include_router(reviews.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
