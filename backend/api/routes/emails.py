import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from backend.models.email import EmailResponse, EmailProcessRequest
from backend.database.dynamodb import db
from backend.services.imap_service import ImapEmailFetcher
from backend.services.notification_service import manager
from backend.agents.preprocessor import EmailPreprocessor
from backend.agents.classifier_agent import ClassifierAgent
from backend.agents.priority_agent import PriorityAgent
from backend.agents.task_extractor import TaskExtractorAgent
from backend.agents.summarizer_agent import SummarizerAgent
from backend.agents.sentiment_agent import SentimentAgent
from backend.agents.draft_generator import DraftGeneratorAgent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/emails", tags=["emails"])

# Initialize agents
preprocessor = EmailPreprocessor()
classifier = ClassifierAgent()
priority_detector = PriorityAgent()
task_extractor = TaskExtractorAgent()
summarizer = SummarizerAgent()
sentiment_analyzer = SentimentAgent()
draft_generator = DraftGeneratorAgent()
fetcher = ImapEmailFetcher()

def run_pipeline(email_data: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the full AI processing pipeline for a single email dict."""
    raw_body = email_data.get("body", "")
    
    # 1. Preprocess
    cleaned_body = preprocessor.preprocess(raw_body)
    
    # 2. Classification
    class_res = classifier.classify(cleaned_body)
    
    # 3. Priority Detection
    priority_res = priority_detector.detect_priority(cleaned_body)
    
    # 4. Sentiment Analysis
    sentiment_res = sentiment_analyzer.detect_sentiment(cleaned_body)
    
    # 5. Task Extraction
    tasks = task_extractor.extract_tasks(cleaned_body)
    
    # 6. Summarization
    summary = summarizer.summarize(cleaned_body)
    
    # 7. Draft Generation
    sender_name = email_data.get("sender", {}).get("name", "Sender")
    subject = email_data.get("subject", "")
    auto_reply = draft_generator.generate_draft(
        sender_name=sender_name,
        subject=subject,
        category=class_res["category"],
        sentiment=sentiment_res["sentiment"],
        tasks=tasks
    )
    
    # Assemble processed email object
    processed_email = {
        "email_id": email_data["email_id"],
        "subject": subject,
        "sender": email_data["sender"],
        "recipients": email_data.get("recipients", []),
        "body": raw_body,
        "cleaned_body": cleaned_body,
        "category": class_res["category"],
        "category_confidence": float(class_res["confidence"]),
        "priority": priority_res["priority"],
        "priority_score": float(priority_res["priority_score"]),
        "sentiment": sentiment_res["sentiment"],
        "sentiment_score": float(sentiment_res["sentiment_score"]),
        "summary": summary,
        "auto_reply_draft": auto_reply,
        "received_at": email_data["received_at"],
        "processed_at": datetime.utcnow().isoformat() + "Z",
        "is_read": email_data.get("is_read", False)
    }
    
    # Store in database
    db.save_email(processed_email)
    
    # Save extracted tasks
    for task_item in tasks:
        new_task = {
            "task_id": str(uuid.uuid4()),
            "email_id": email_data["email_id"],
            "task": task_item["task"],
            "due_date": task_item["due_date"],
            "owner": task_item["owner"],
            "status": "Pending",
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        db.save_task(new_task)
        
    return processed_email

@router.get("", response_model=List[EmailResponse])
async def list_emails():
    """Retrieve all processed emails from database, sorted by received timestamp."""
    return db.list_emails()

@router.get("/{email_id}")
async def get_email(email_id: str):
    """Retrieve details for a single email, including its associated checklist tasks."""
    email_item = db.get_email(email_id)
    if not email_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email with ID {email_id} not found"
        )
    # Fetch related tasks
    tasks = db.list_tasks(email_id=email_id)
    return {
        "email": email_item,
        "tasks": tasks
    }

@router.post("/fetch")
async def fetch_and_process_emails(background_tasks: BackgroundTasks, limit: int = 10):
    """
    Triggers IMAP client to fetch raw incoming emails, filters out duplicates,
    runs the AI processing pipeline, stores records, and broadcasts updates.
    """
    try:
        raw_emails = fetcher.fetch_emails(limit=limit)
        new_emails_processed = 0
        processed_records = []

        for email_item in raw_emails:
            # Check for duplicates using email_id (derived from Message-ID hash)
            exists = db.get_email(email_item["email_id"])
            if not exists:
                processed = run_pipeline(email_item)
                processed_records.append(processed)
                new_emails_processed += 1
                
        if new_emails_processed > 0:
            # Broadcast the event to all active dashboard websockets
            background_tasks.add_task(
                manager.broadcast,
                {
                    "type": "NEW_EMAILS",
                    "count": new_emails_processed,
                    "message": f"{new_emails_processed} new email(s) fetched and analyzed.",
                    "emails": [
                        {
                            "email_id": e["email_id"],
                            "subject": e["subject"],
                            "sender": e["sender"],
                            "category": e["category"],
                            "priority": e["priority"]
                        } for e in processed_records
                    ]
                }
            )

        return {
            "status": "success",
            "fetched": len(raw_emails),
            "new_processed": new_emails_processed
        }
    except Exception as e:
        logger.error(f"Failed to fetch and process emails: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed email fetch execution: {str(e)}"
        )

@router.post("/process-email", response_model=EmailResponse)
async def process_single_email(req: EmailProcessRequest, background_tasks: BackgroundTasks):
    """Manually parse a single custom email payload and save to the dashboard."""
    email_id = str(uuid.uuid4())
    received_time = req.received_at or (datetime.utcnow().isoformat() + "Z")
    
    email_payload = {
        "email_id": email_id,
        "subject": req.subject,
        "sender": {
            "name": req.sender_name,
            "address": req.sender_address
        },
        "recipients": [],
        "body": req.body,
        "received_at": received_time
    }
    
    try:
        processed = run_pipeline(email_payload)
        
        # Broadcast the manual addition to update charts immediately
        background_tasks.add_task(
            manager.broadcast,
            {
                "type": "NEW_EMAILS",
                "count": 1,
                "message": f"Manual email '{req.subject}' processed successfully.",
                "emails": [{
                    "email_id": processed["email_id"],
                    "subject": processed["subject"],
                    "sender": processed["sender"],
                    "category": processed["category"],
                    "priority": processed["priority"]
                }]
            }
        )
        
        return processed
    except Exception as e:
        logger.error(f"Error processing manual email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Email processing pipeline failed: {str(e)}"
        )

@router.patch("/{email_id}/read")
async def mark_email_read_status(email_id: str, payload: dict):
    """Update the read status (is_read) of a processed email."""
    is_read = payload.get("is_read", True)
    updated_email = db.update_email_read_status(email_id, is_read)
    if not updated_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email with ID {email_id} not found"
        )
    return {"status": "success", "email": updated_email}
