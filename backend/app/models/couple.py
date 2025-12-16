from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class Couple(Base):
    __tablename__ = "couples"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(Text, server_default="(datetime('now'))")

    # Relationships
    users = relationship("User", back_populates="couple", foreign_keys="User.couple_id")
    invites = relationship("Invite", back_populates="couple")
    swipes = relationship("Swipe", back_populates="couple")

    def __str__(self):
        if self.users:
            names = [u.display_name or u.email.split("@")[0] for u in self.users[:2]]
            return " & ".join(names) if names else f"Couple {self.id[:8]}"
        return f"Couple {self.id[:8]}"
