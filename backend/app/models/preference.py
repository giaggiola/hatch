from sqlalchemy import Column, String, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    origins = Column(Text, default="[]")  # JSON array
    genders = Column(Text, default="[]")  # JSON array
    starting_letters = Column(Text, default="[]")  # JSON array
    max_length = Column(Integer, nullable=True)
    updated_at = Column(Text, server_default="(datetime('now'))", onupdate="(datetime('now'))")

    # Relationships
    user = relationship("User", back_populates="preferences")

    def __str__(self):
        return f"Prefs for {self.user}" if self.user else f"Prefs {self.id[:8]}"
