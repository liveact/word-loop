from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Word(Base):
    __tablename__ = "words"

    id = Column(Integer, primary_key=True, autoincrement=True)
    word = Column(String(255), nullable=False, unique=True, index=True)
    phonetic = Column(Text, nullable=True)
    definition = Column(Text, nullable=True)
    translation = Column(Text, nullable=True)
    pos = Column(Text, nullable=True)
    collins = Column(Integer, nullable=True)
    oxford = Column(Integer, nullable=True)
    tag = Column(Text, nullable=True)
    bnc = Column(Integer, nullable=True)
    frq = Column(Integer, nullable=True)
    exchange = Column(Text, nullable=True)

    book_words = relationship("BookWord", back_populates="word_ref")
