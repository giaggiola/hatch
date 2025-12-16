from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class Invite(Base):
    __tablename__ = "invites"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(Text, unique=True, nullable=False)
    couple_id = Column(String(36), ForeignKey("couples.id"), nullable=False)
    invited_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    invited_email = Column(Text, nullable=True)
    status = Column(Text, default="pending")  # pending, accepted, expired
    expires_at = Column(Text, nullable=True)
    created_at = Column(Text, server_default="(datetime('now'))")

    # Relationships
    couple = relationship("Couple", back_populates="invites")
    invited_by_user = relationship("User", back_populates="invites_sent", foreign_keys=[invited_by])

    def __str__(self):
        return f"{self.code} ({self.status})"
