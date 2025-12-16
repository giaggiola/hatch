from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class HistoricalFigure(BaseModel):
    name: str
    description: str


class FictionalCharacter(BaseModel):
    name: str
    source: str
    description: str


class CulturalReferences(BaseModel):
    religious: Optional[str] = None
    mythological: Optional[str] = None
    literary: Optional[str] = None


class NameFactsResponse(BaseModel):
    """Response model for name facts/enriched data."""
    origin_language: Optional[str] = None
    meaning: Optional[str] = None
    nicknames: List[str] = []
    historical_figures: List[HistoricalFigure] = []
    fictional_characters: List[FictionalCharacter] = []
    cultural_references: Optional[CulturalReferences] = None

    class Config:
        from_attributes = True


class NameResponse(BaseModel):
    """Response model for a name with aggregated popularity stats."""
    id: str
    name: str
    gender: Optional[str] = None
    meaning: Optional[str] = None
    length: Optional[int] = None
    # Aggregated from name_popularity
    countries: List[str] = []  # ISO country codes where this name is popular
    popularity_rank: Optional[int] = None  # Best (lowest) rank across user's selected countries
    weighted_count: Optional[float] = None  # Sum of weighted counts across user's selected countries
    popularity_percentile: Optional[float] = None  # Best percentile (top X%) across countries

    class Config:
        from_attributes = True


class SimilarNameResponse(BaseModel):
    """A similar name variant with similarity score."""
    id: str
    name: str
    gender: Optional[str] = None
    similarity: float  # Cosine similarity score (0-1)
    countries: List[str] = []
    popularity_rank: Optional[int] = None
    weighted_count: Optional[float] = None

    class Config:
        from_attributes = True


class NameWithSimilarResponse(BaseModel):
    """A name with its similar variants computed on-the-fly."""
    id: str
    name: str
    gender: Optional[str] = None
    meaning: Optional[str] = None
    length: Optional[int] = None
    countries: List[str] = []
    popularity_rank: Optional[int] = None
    weighted_count: Optional[float] = None
    similar: List[SimilarNameResponse] = []  # Similar name variants

    class Config:
        from_attributes = True
