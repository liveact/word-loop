from pydantic import BaseModel


class ProfileOut(BaseModel):
    active_book_id: int | None = None

    class Config:
        from_attributes = True


class SetActiveBookRequest(BaseModel):
    book_id: int
