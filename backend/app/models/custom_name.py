from sqlalchemy import Column, String, Text, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class CustomName(Base):
    """
    A custom name added by a user that doesn't exist in the main names database.
    These can be swiped on like regular names.
    """
    __tablename__ = "custom_names"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    couple_id = Column(String(36), ForeignKey("couples.id"), nullable=False)
    name = Column(Text, nullable=False)
    gender = Column(Text, nullable=False, default="U")

    created_at = Column(Text, server_default="(datetime('now'))")

    # Relationships
    user = relationship("User", back_populates="custom_names")
    couple = relationship("Couple", back_populates="custom_names")

    __table_args__ = (
        CheckConstraint("gender IN ('M', 'F', 'U')", name="check_custom_name_gender"),
    )

    def __str__(self):
        return f"Custom: {self.name} ({self.gender})"
