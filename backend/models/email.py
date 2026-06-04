from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
from datetime import datetime

class EmailSender(BaseModel):
    name: Optional[str] = "Unknown"
    address: str

class EmailRecipient(BaseModel):
    name: Optional[str] = "Unknown"
    address: str

class EmailBase(BaseModel):
    subject: str
    sender: EmailSender
    recipients: List[EmailRecipient] = []
    body: str
    cleaned_body: Optional[str] = None
    category: Optional[str] = None
    category_confidence: Optional[float] = None
    priority: Optional[str] = None
    priority_score: Optional[float] = None
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    summary: Optional[str] = None
    auto_reply_draft: Optional[str] = None
    received_at: str
    is_read: bool = False

class EmailCreate(EmailBase):
    pass

class EmailResponse(EmailBase):
    email_id: str
    processed_at: str

class EmailProcessRequest(BaseModel):
    subject: str
    sender_name: Optional[str] = "Unknown"
    sender_address: str
    body: str
    received_at: Optional[str] = None
