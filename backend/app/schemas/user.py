from pydantic import BaseModel, EmailStr
from typing import Optional


class UserCreate(BaseModel):
    google_id: str
    email: EmailStr
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    family_name: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: Optional[str] = None
    family_name: Optional[str] = None
    avatar_url: Optional[str] = None
    couple_id: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class PartnerResponse(BaseModel):
    id: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True
