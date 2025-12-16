from pydantic import BaseModel
from typing import Optional, Literal, List
from app.schemas.name import NameResponse


class SwipeCreate(BaseModel):
    """Create a swipe on a single name."""
    name_id: str
    action: Literal["like", "dismiss"]


class SwipeUpdate(BaseModel):
    """Update an existing swipe."""
    action: Literal["like", "dismiss"]


class SwipeResponse(BaseModel):
    """Response for a single swipe."""
    id: str
    name_id: str
    action: str
    created_at: Optional[str] = None
    name: Optional[NameResponse] = None

    class Config:
        from_attributes = True


class SwipeResultResponse(BaseModel):
    """Result after creating/updating a swipe."""
    match: bool
    name: Optional[NameResponse] = None


class BatchSwipeCreate(BaseModel):
    """Create multiple swipes at once (for card swiping)."""
    swipes: List[SwipeCreate]


class BatchSwipeResultResponse(BaseModel):
    """Result of a batch swipe operation."""
    created: int
    matches: List[NameResponse] = []
