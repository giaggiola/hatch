from sqlalchemy import Column, String, Text, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class Swipe(Base):
    """
    A swipe represents a user's decision on a single name.
    One swipe = one name_id = one action (like or dismiss).
    """
    __tablename__ = "swipes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    name_id = Column(String(36), ForeignKey("names.id"), nullable=False)
    couple_id = Column(String(36), ForeignKey("couples.id"), nullable=False)
    action = Column(Text, nullable=False)  # like, dismiss

    created_at = Column(Text, server_default="(datetime('now'))")
    updated_at = Column(Text, server_default="(datetime('now'))", onupdate="(datetime('now'))")

    # Relationships
    user = relationship("User", back_populates="swipes")
    name = relationship("Name", back_populates="swipes")
    couple = relationship("Couple", back_populates="swipes")

    __table_args__ = (
        UniqueConstraint("user_id", "name_id", name="unique_user_name_swipe"),
        CheckConstraint("action IN ('like', 'dismiss')", name="check_action"),
    )

    def __str__(self):
        action_icon = "❤️" if self.action == "like" else "👎"
        name_str = self.name.name if self.name else "?"
        return f"{action_icon} {name_str}"
