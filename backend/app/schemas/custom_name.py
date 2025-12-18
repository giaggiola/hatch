from pydantic import BaseModel
from typing import Optional, Literal


class CustomNameCreate(BaseModel):
    """Create a custom name."""
    name: str
    gender: Literal["M", "F", "U"] = "U"


class CustomNameResponse(BaseModel):
    """Response for a custom name."""
    id: str
    name: str
    gender: str
    user_id: str
    couple_id: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True
