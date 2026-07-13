from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import relationship

from app.database import Base


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    display_name = Column(String(200), nullable=False)
    total_words = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())

    words = relationship("BookWord", back_populates="book")
    rounds = relationship("Round", back_populates="book")


class BookWord(Base):
    __tablename__ = "book_words"
    __table_args__ = (
        Index("ix_book_words_book_word", "book_id", "word_id", unique=True),
        Index("ix_book_words_book_order", "book_id", "order_index"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    word_id = Column(Integer, ForeignKey("words.id"), nullable=False)
    order_index = Column(Integer, nullable=False)

    book = relationship("Book", back_populates="words")
    word_ref = relationship("Word", back_populates="book_words")
