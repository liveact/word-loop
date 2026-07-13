from datetime import datetime, timezone

from pydantic import BaseModel, field_serializer


def _serialize_utc(v: datetime | None) -> str | None:
    if v is None:
        return None
    if v.tzinfo is None:
        v = v.replace(tzinfo=timezone.utc)
    return v.strftime("%Y-%m-%dT%H:%M:%SZ")


class BookInfo(BaseModel):
    id: int
    name: str
    display_name: str
    total_words: int

    class Config:
        from_attributes = True


class ActiveRoundInfo(BaseModel):
    id: int
    round_number: int
    total_words: int
    current_position: int


class UnfinishedInfo(BaseModel):
    type: str  # resume_learning | start_review | resume_review
    session_id: int | None = None
    review_id: int | None = None
    session_started_at: datetime | None = None
    session_word_count: int = 0
    session_current_index: int = 0
    review_current_index: int = 0
    review_total_count: int = 0

    _ser_dt = field_serializer("session_started_at")(_serialize_utc)


class RecentSessionInfo(BaseModel):
    id: int
    word_count: int
    status: str = ""
    review_count: int = 0
    started_at: datetime | None = None
    learn_completed_at: datetime | None = None

    class Config:
        from_attributes = True

    _ser_started = field_serializer("started_at")(_serialize_utc)
    _ser_completed = field_serializer("learn_completed_at")(_serialize_utc)


class DashboardOut(BaseModel):
    book: BookInfo | None = None
    stars: int = 0
    active_round: ActiveRoundInfo | None = None
    unfinished: UnfinishedInfo | None = None
    recent_sessions: list[RecentSessionInfo] = []
