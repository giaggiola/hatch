from sqlalchemy import Column, String, Text, Integer, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class Name(Base):
    """
    A unique name entry identified by (name, gender).
    Popularity stats are stored in the NamePopularity table.
    """
    __tablename__ = "names"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(Text, nullable=False)
    gender = Column(Text, nullable=True)  # M, F, U
    meaning = Column(Text, nullable=True)
    length = Column(Integer, nullable=True)
    embedding = Column(Text, nullable=True)  # JSON-encoded embedding vector

    # Relationships
    swipes = relationship("Swipe", back_populates="name")
    popularity = relationship("NamePopularity", back_populates="name", cascade="all, delete-orphan")
    facts = relationship("NameFact", back_populates="name", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("gender IN ('M', 'F', 'U')", name="check_gender"),
        UniqueConstraint("name", "gender", name="unique_name_gender"),
    )

    def __str__(self):
        return f"{self.name} ({self.gender})"
