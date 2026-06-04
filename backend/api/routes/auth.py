import imaplib
import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from backend.utils.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

class ImapCredentialsRequest(BaseModel):
    imap_server: str
    imap_port: int
    imap_email: str
    imap_password: str
    demo_mode: bool = False

@router.get("/status")
async def get_auth_status():
    """Retrieve the current connection state and settings info."""
    return {
        "is_authenticated": not settings.use_mock_imap,
        "imap_email": settings.IMAP_EMAIL,
        "imap_server": settings.IMAP_SERVER,
        "demo_mode": settings.DEMO_MODE,
        "ai_mode": settings.AI_MODE,
        "database_mode": "Local JSON DB" if settings.use_mock_db else "AWS DynamoDB"
    }

@router.post("/test-imap")
async def test_imap_connection(req: ImapCredentialsRequest):
    """Attempt a dry login to the specified IMAP server to test credentials."""
    if req.demo_mode:
        return {"status": "success", "message": "Demo mode connection mock successful!"}
        
    password = req.imap_password
    # Fallback to stored password if empty/placeholder and email matches
    if (not password or password == "••••••••••••••••") and req.imap_email == settings.IMAP_EMAIL:
        password = settings.IMAP_PASSWORD

    try:
        # Establish testing link
        mail = imaplib.IMAP4_SSL(req.imap_server, req.imap_port, timeout=10.0)
        mail.login(req.imap_email, password)
        mail.logout()
        return {"status": "success", "message": "IMAP Connection verified successfully!"}
    except Exception as e:
        logger.error(f"IMAP test connection failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to connect to IMAP server: {str(e)}"
        )

@router.post("/config")
async def update_configuration(req: ImapCredentialsRequest):
    """Dynamically update credentials and application config parameters in memory."""
    settings.IMAP_SERVER = req.imap_server
    settings.IMAP_PORT = req.imap_port
    settings.IMAP_EMAIL = req.imap_email
    
    # Only update the password if a new value is actually provided
    if req.imap_password and req.imap_password != "••••••••••••••••":
        settings.IMAP_PASSWORD = req.imap_password
        
    settings.DEMO_MODE = req.demo_mode
    
    # Recalculate properties
    logger.info(f"Updated backend settings: email={settings.IMAP_EMAIL}, demo={settings.DEMO_MODE}")
    
    return {
        "status": "success",
        "message": "Configuration updated successfully",
        "config": {
            "imap_email": settings.IMAP_EMAIL,
            "imap_server": settings.IMAP_SERVER,
            "demo_mode": settings.DEMO_MODE,
            "ai_mode": settings.AI_MODE
        }
    }

@router.post("/clear-database")
async def clear_database():
    """Wipes database files/tables clean and resets analytics metadata."""
    from backend.database.dynamodb import db, LOCAL_DB_FILE, DEFAULT_LOCAL_DB
    import json
    
    if settings.use_mock_db:
        try:
            with open(LOCAL_DB_FILE, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_LOCAL_DB, f, indent=2, ensure_ascii=False)
            return {"status": "success", "message": "Local JSON Database cleared successfully."}
        except Exception as e:
            logger.error(f"Failed clearing local DB: {e}")
            raise HTTPException(status_code=500, detail=f"Clear database failed: {str(e)}")
    else:
        try:
            # Delete emails
            emails = db.list_emails()
            for e in emails:
                db.emails_table.delete_item(Key={"email_id": e["email_id"]})
            # Delete tasks
            tasks = db.list_tasks()
            for t in tasks:
                db.tasks_table.delete_item(Key={"task_id": t["task_id"]})
            # Reset stats
            db.update_analytics()
            return {"status": "success", "message": "DynamoDB Tables cleared successfully."}
        except Exception as e:
            logger.error(f"Failed clearing DynamoDB tables: {e}")
            raise HTTPException(status_code=500, detail=f"Clear DynamoDB failed: {str(e)}")

