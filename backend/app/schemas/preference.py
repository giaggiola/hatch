from pydantic import BaseModel
from typing import Optional, List


class PreferenceUpdate(BaseModel):
    origins: Optional[List[str]] = None
    genders: Optional[List[str]] = None
    starting_letters: Optional[List[str]] = None
    max_length: Optional[int] = None


class PreferenceResponse(BaseModel):
    origins: List[str] = []
    genders: List[str] = []
    starting_letters: List[str] = []
    max_length: Optional[int] = None

    class Config:
        from_attributes = True
