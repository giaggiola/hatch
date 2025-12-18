from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    google_id = Column(Text, unique=True, nullable=False)
    email = Column(Text, unique=True, nullable=False)
    display_name = Column(Text, nullable=True)
    family_name = Column(Text, nullable=True)
    avatar_url = Column(Text, nullable=True)
    couple_id = Column(String(36), ForeignKey("couples.id"), nullable=True)
    created_at = Column(Text, server_default="(datetime('now'))")
    updated_at = Column(Text, server_default="(datetime('now'))", onupdate="(datetime('now'))")

    # Relationships
    couple = relationship("Couple", back_populates="users", foreign_keys=[couple_id])
    preferences = relationship("UserPreference", back_populates="user", uselist=False)
    swipes = relationship("Swipe", back_populates="user")
    invites_sent = relationship("Invite", back_populates="invited_by_user", foreign_keys="Invite.invited_by")
    custom_names = relationship("CustomName", back_populates="user")

    def __str__(self):
        return self.display_name or self.email.split("@")[0]
