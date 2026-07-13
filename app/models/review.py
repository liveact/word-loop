from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        Index("ix_reviews_session", "session_id"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    order_json = Column(Text, nullable=False)
    total_count = Column(Integer, nullable=False)
    current_index = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="in_progress")
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)

    session = relationship("Session", back_populates="reviews")
