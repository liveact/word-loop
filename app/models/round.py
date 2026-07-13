from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class Round(Base):
    __tablename__ = "rounds"
    __table_args__ = (
        Index("ix_rounds_book_status", "book_id", "status"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    order_json = Column(Text, nullable=False)
    total_words = Column(Integer, nullable=False)
    current_position = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="active")
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)

    book = relationship("Book", back_populates="rounds")
    sessions = relationship("Session", back_populates="round")
