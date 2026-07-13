from sqlalchemy import Column, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.database import Base


class UserProfile(Base):
    __tablename__ = "user_profile"

    id = Column(Integer, primary_key=True, default=1)
    active_book_id = Column(Integer, ForeignKey("books.id"), nullable=True)

    active_book = relationship("Book")
