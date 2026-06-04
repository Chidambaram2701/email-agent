import os
import sys

# Ensure backend's parent folder is in python path so 'backend' can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.utils.config import settings
from backend.database.dynamodb import db
from backend.api.routes import auth, emails, tasks, analytics
from backend.services.notification_service import manager
from backend.services.imap_service import ImapEmailFetcher

# Configure logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    description="Enterprise AI Email Intelligence Agent API backend",
    version="1.0.0"
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router)
app.include_router(emails.router)
app.include_router(tasks.router)
app.include_router(analytics.router)

# WebSocket Endpoint for real-time dashboard alerts
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for ping or messages if needed
            data = await websocket.receive_text()
            # Echo or process if needed, currently clients only receive broadcasts
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket client error: {e}")
        manager.disconnect(websocket)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting Enterprise AI Email Intelligence Agent...")
    
    # 1. Initialize Tables/Files
    # For DynamoDB local or AWS, tables are initialized. For JSON, file is prepared.
    try:
        # Check if database is empty. If it is, seed with initial mock emails.
        emails_list = db.list_emails()
        if not emails_list:
            logger.info("Database is empty. Seeding initial parsed emails to populate dashboard...")
            # Import emails router run_pipeline to parse and seed
            from backend.api.routes.emails import run_pipeline
            fetcher = ImapEmailFetcher()
            # Generate 6 mock emails
            seed_emails = fetcher._generate_mock_emails(limit=6)
            for item in seed_emails:
                run_pipeline(item)
            logger.info("Seeding completed successfully.")
            
            # Recalculate stats
            db.update_analytics()
    except Exception as e:
        logger.error(f"Failed during startup db seed: {e}")

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "status": "online",
        "api_docs": "/docs"
    }
