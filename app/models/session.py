from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import relationship

from app.database import Base


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        Index("ix_sessions_round_status", "round_id", "status"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    round_id = Column(Integer, ForeignKey("rounds.id"), nullable=False)
    start_position = Column(Integer, nullable=False)
    end_position = Column(Integer, nullable=True)
    word_count = Column(Integer, nullable=False, default=0)
    current_index = Column(Integer, nullable=False, default=0)
    status = Column(String(30), nullable=False, default="learning")
    started_at = Column(DateTime, server_default=func.now())
    learn_completed_at = Column(DateTime, nullable=True)

    round = relationship("Round", back_populates="sessions")
    reviews = relationship("Review", back_populates="session")
