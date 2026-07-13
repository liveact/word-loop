from datetime import datetime, timezone

from pydantic import BaseModel, field_serializer


def _serialize_utc(v: datetime | None) -> str | None:
    if v is None:
        return None
    if v.tzinfo is None:
        v = v.replace(tzinfo=timezone.utc)
    return v.strftime("%Y-%m-%dT%H:%M:%SZ")


class StartLearningRequest(BaseModel):
    book_id: int


class SessionOut(BaseModel):
    id: int
    round_id: int
    start_position: int
    end_position: int | None = None
    word_count: int
    current_index: int
    status: str
    started_at: datetime | None = None
    learn_completed_at: datetime | None = None

    class Config:
        from_attributes = True

    _ser_started = field_serializer("started_at")(_serialize_utc)
    _ser_completed = field_serializer("learn_completed_at")(_serialize_utc)


class CompleteLearningRequest(BaseModel):
    end_position: int
    word_count: int
    current_index: int


class ProgressUpdate(BaseModel):
    current_index: int
