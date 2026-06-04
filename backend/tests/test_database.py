import pytest
import os
import sys

# Ensure backend's parent folder is in python path so 'backend' can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database.dynamodb import LocalJsonDatabase

TEST_DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_db.json")

@pytest.fixture
def test_db():
    # Remove existing test file if present
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    
    # Initialize a new local database instance
    db_inst = LocalJsonDatabase(TEST_DB_FILE)
    yield db_inst
    
    # Cleanup after tests
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

def test_database_crud_and_analytics(test_db):
    # 1. Initially database should be empty
    emails = test_db.list_emails()
    tasks = test_db.list_tasks()
    analytics = test_db.get_analytics()
    
    assert len(emails) == 0
    assert len(tasks) == 0
    assert analytics["total_emails"] == 0

    # 2. Save an Email
    email_data = {
        "email_id": "test-email-uuid-1",
        "subject": "Urgent Finance Review",
        "sender": {"name": "Finance team", "address": "billing@company.com"},
        "recipients": [],
        "body": "Please review the budget allocations.",
        "cleaned_body": "Please review the budget allocations.",
        "category": "Finance",
        "category_confidence": 0.95,
        "priority": "High",
        "priority_score": 0.8,
        "sentiment": "Neutral",
        "sentiment_score": 0.0,
        "summary": "Please review the budget allocations.",
        "auto_reply_draft": "I will check.",
        "received_at": "2026-06-01T12:00:00Z",
        "processed_at": "2026-06-01T12:01:00Z"
    }
    
    test_db.save_email(email_data)
    
    # Verify email was saved
    fetched_email = test_db.get_email("test-email-uuid-1")
    assert fetched_email is not None
    assert fetched_email["subject"] == "Urgent Finance Review"
    
    # Check that analytics updated
    analytics = test_db.get_analytics()
    assert analytics["total_emails"] == 1
    assert analytics["category_counts"]["Finance"] == 1
    assert analytics["priority_counts"]["High"] == 1

    # 3. Save a Task
    task_data = {
        "task_id": "test-task-uuid-1",
        "email_id": "test-email-uuid-1",
        "task": "Review budget allocations",
        "due_date": "No Deadline",
        "owner": "Me",
        "status": "Pending",
        "created_at": "2026-06-01T12:01:00Z"
    }
    
    test_db.save_task(task_data)
    
    # Verify task was saved
    fetched_task = test_db.get_task("test-task-uuid-1")
    assert fetched_task is not None
    assert fetched_task["task"] == "Review budget allocations"
    
    # Check that task stats in analytics updated
    analytics = test_db.get_analytics()
    assert analytics["task_statistics"]["total"] == 1
    assert analytics["task_statistics"]["Pending"] == 1
    assert analytics["task_completion_rate"] == 0.0

    # 4. Update the Task (Move to Completed)
    test_db.update_task("test-task-uuid-1", {"status": "Completed"})
    
    # Verify task is Completed
    fetched_task = test_db.get_task("test-task-uuid-1")
    assert fetched_task["status"] == "Completed"
    
    # Check that completion rate recalculated
    analytics = test_db.get_analytics()
    assert analytics["task_statistics"]["Completed"] == 1
    assert analytics["task_completion_rate"] == 100.0

    # 5. Delete the Task
    success = test_db.delete_task("test-task-uuid-1")
    assert success is True
    
    # Verify task is deleted
    assert test_db.get_task("test-task-uuid-1") is None
    
    # Verify analytics tasks reset to 0
    analytics = test_db.get_analytics()
    assert analytics["task_statistics"]["total"] == 0
    assert analytics["task_completion_rate"] == 0.0
