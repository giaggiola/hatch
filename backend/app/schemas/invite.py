from pydantic import BaseModel, EmailStr
from typing import Optional


class InviteCreate(BaseModel):
    invited_email: Optional[EmailStr] = None


class InviteResponse(BaseModel):
    id: str
    code: str
    status: str
    invited_email: Optional[str] = None
    expires_at: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class InviteDetailResponse(BaseModel):
    code: str
    status: str
    invited_by_name: Optional[str] = None

    class Config:
        from_attributes = True
