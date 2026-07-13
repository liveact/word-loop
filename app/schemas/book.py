from pydantic import BaseModel, computed_field


class BookOut(BaseModel):
    id: int
    name: str
    display_name: str
    total_words: int

    class Config:
        from_attributes = True


class WordOut(BaseModel):
    id: int
    word: str
    phonetic: str | None = None
    translation: str | None = None

    @computed_field
    @property
    def meaning(self) -> str:
        return self.translation or ""

    class Config:
        from_attributes = True
