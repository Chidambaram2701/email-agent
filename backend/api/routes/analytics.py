import logging
from fastapi import APIRouter
from backend.models.analytics import AnalyticsResponse
from backend.database.dynamodb import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("", response_model=AnalyticsResponse)
async def get_analytics():
    """Retrieve full dynamic analytics snapshot from database."""
    # This automatically loads from DynamoDB or fallback JSON file
    return db.get_analytics()

@router.get("/priority-stats")
async def get_priority_stats():
    """Helper endpoint to fetch priority count distribution."""
    data = db.get_analytics()
    return data.get("priority_counts", {"High": 0, "Medium": 0, "Low": 0})

@router.get("/category-stats")
async def get_category_stats():
    """Helper endpoint to fetch category count distribution."""
    data = db.get_analytics()
    return data.get("category_counts", {"Work": 0, "Meeting": 0, "HR": 0, "Finance": 0, "Personal": 0, "Spam": 0})
