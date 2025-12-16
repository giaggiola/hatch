from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class NameFact(Base):
    """
    Enriched name data from Gemini API.
    One-to-one relationship with Name.
    """
    __tablename__ = "name_facts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name_id = Column(String(36), ForeignKey('names.id', ondelete='CASCADE'), nullable=False, unique=True)

    # Core facts
    origin_language = Column(Text, nullable=True)  # e.g., "Hebrew", "Latin", "Greek"
    meaning = Column(Text, nullable=True)  # Full meaning/etymology
    nicknames = Column(Text, nullable=True)  # JSON array: ["Jim", "Jimmy"]

    # People & characters
    historical_figures = Column(Text, nullable=True)  # JSON array of {name, description}
    fictional_characters = Column(Text, nullable=True)  # JSON array of {name, source, description}

    # Cultural significance
    cultural_references = Column(Text, nullable=True)  # JSON: {religious, mythological, literary}

    # Embeddings (JSON-encoded vectors, 768 dimensions each)
    embedding_phonetic = Column(Text, nullable=True)  # name + nicknames
    embedding_etymology = Column(Text, nullable=True)  # meaning + origin
    embedding_associations = Column(Text, nullable=True)  # historical + fictional + cultural

    # Metadata
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    name = relationship("Name", back_populates="facts")

    def __str__(self):
        return f"NameFact({self.name_id})"
