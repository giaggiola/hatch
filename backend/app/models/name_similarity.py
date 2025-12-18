from sqlalchemy import Column, String, Float, Integer, ForeignKey, UniqueConstraint
from app.database import Base
import uuid


class NameSimilarity(Base):
    """
    Pre-computed similar names for fast lookup.
    Each name has up to 20 similar names stored with their similarity scores.
    """
    __tablename__ = "name_similarities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name_id = Column(String(36), ForeignKey('names.id', ondelete='CASCADE'), nullable=False)
    similar_name_id = Column(String(36), ForeignKey('names.id', ondelete='CASCADE'), nullable=False)
    similarity = Column(Float, nullable=False)
    rank = Column(Integer, nullable=False)  # 1-20, ordered by similarity desc

    __table_args__ = (
        UniqueConstraint('name_id', 'similar_name_id', name='uq_name_similarities'),
    )
