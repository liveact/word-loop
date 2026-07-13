from datetime import datetime, timezone

from pydantic import BaseModel, field_serializer


def _serialize_utc(v: datetime | None) -> str | None:
    if v is None:
        return None
    if v.tzinfo is None:
        v = v.replace(tzinfo=timezone.utc)
    return v.strftime("%Y-%m-%dT%H:%M:%SZ")


class CreateReviewRequest(BaseModel):
    session_id: int


class ReviewOut(BaseModel):
    id: int
    session_id: int
    total_count: int
    current_index: int
    status: str
    started_at: datetime | None = None
    completed_at: datetime | None = None

    class Config:
        from_attributes = True

    _ser_started = field_serializer("started_at")(_serialize_utc)
    _ser_completed = field_serializer("completed_at")(_serialize_utc)


class ReviewProgressUpdate(BaseModel):
    current_index: int
