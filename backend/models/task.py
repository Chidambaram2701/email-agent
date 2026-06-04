from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class TaskBase(BaseModel):
    task: str
    due_date: Optional[str] = "No Deadline"
    owner: Optional[str] = "Me"
    status: str = Field(default="Pending", description="Pending, In Progress, Completed")

class TaskCreate(TaskBase):
    email_id: str

class TaskUpdate(BaseModel):
    task: Optional[str] = None
    due_date: Optional[str] = None
    owner: Optional[str] = None
    status: Optional[str] = None

class TaskResponse(TaskBase):
    task_id: str
    email_id: str
    created_at: str
