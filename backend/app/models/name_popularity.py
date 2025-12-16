from sqlalchemy import Column, Float, String, Integer, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class NamePopularity(Base):
    """
    Per-country popularity stats for a name.
    Links names to countries with popularity metrics.
    """
    __tablename__ = "name_popularity"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name_id = Column(String(36), ForeignKey("names.id", ondelete="CASCADE"), nullable=False, index=True)
    country_code = Column(String(2), nullable=False, index=True)  # ISO 3166-1 alpha-2
    popularity_rank = Column(Integer, nullable=True)  # Rank within country (1 = most popular)
    weighted_count = Column(Float, nullable=True)  # Half-life weighted popularity score
    total_count = Column(Integer, nullable=True)  # Raw total count

    # Relationships
    name = relationship("Name", back_populates="popularity")

    __table_args__ = (
        UniqueConstraint("name_id", "country_code", name="unique_name_country"),
        Index("idx_popularity_country_weight", "country_code", "weighted_count"),
    )

    def __str__(self):
        return f"{self.country_code}: rank={self.popularity_rank}"
