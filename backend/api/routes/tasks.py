import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from backend.models.task import TaskResponse, TaskUpdate
from backend.database.dynamodb import db
from backend.services.notification_service import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.get("", response_model=List[TaskResponse])
async def list_tasks(email_id: Optional[str] = None):
    """Retrieve list of all tasks. Optionally filter by parent email ID."""
    return db.list_tasks(email_id=email_id)

@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, updates: TaskUpdate, background_tasks: BackgroundTasks):
    """Update task properties (status, description, owner, deadline)."""
    # Clean out None fields to prevent overwriting existing details with nulls
    clean_updates = {k: v for k, v in updates.model_dump().items() if v is not None}
    
    if not clean_updates:
        # No updates provided, fetch current task and return
        task = db.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task
        
    updated_task = db.update_task(task_id, clean_updates)
    if not updated_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found"
        )
        
    # Broadcast task changes to update dashboard metrics dynamically
    background_tasks.add_task(
        manager.broadcast,
        {
            "type": "TASK_UPDATED",
            "task_id": task_id,
            "task": updated_task
        }
    )
    
    return updated_task

@router.delete("/{task_id}")
async def delete_task(task_id: str, background_tasks: BackgroundTasks):
    """Delete a task from the list/Kanban board."""
    success = db.delete_task(task_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found or could not be deleted"
        )
        
    # Broadcast task deletion to update dashboard metrics dynamically
    background_tasks.add_task(
        manager.broadcast,
        {
            "type": "TASK_DELETED",
            "task_id": task_id
        }
    )
    
    return {"status": "success", "message": f"Task {task_id} deleted successfully."}
