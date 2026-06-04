from pydantic import BaseModel
from typing import Dict
from datetime import datetime

class PriorityStats(BaseModel):
    high: int = 0
    medium: int = 0
    low: int = 0

class AnalyticsResponse(BaseModel):
    total_emails: int = 0
    priority_counts: Dict[str, int] = {}
    category_counts: Dict[str, int] = {}
    sentiment_counts: Dict[str, int] = {}
    task_statistics: Dict[str, int] = {}
    task_completion_rate: float = 0.0
    updated_at: str
