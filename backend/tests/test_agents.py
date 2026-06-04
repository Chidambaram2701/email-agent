import pytest
import os
import sys

# Ensure backend's parent folder is in python path so 'backend' can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.agents.preprocessor import EmailPreprocessor
from backend.agents.classifier_agent import ClassifierAgent
from backend.agents.priority_agent import PriorityAgent
from backend.agents.task_extractor import TaskExtractorAgent
from backend.agents.summarizer_agent import SummarizerAgent
from backend.agents.sentiment_agent import SentimentAgent
from backend.agents.draft_generator import DraftGeneratorAgent

# Test Preprocessor Module
def test_preprocessor():
    html_input = "<html><body><p>Hello team,</p><p>Check this link: http://google.com</p><p>Regards,<br/>David</p></body></html>"
    
    clean_html = EmailPreprocessor.remove_html(html_input)
    assert "<p>" not in clean_html
    assert "Hello team" in clean_html
    
    clean_urls = EmailPreprocessor.remove_urls(clean_html)
    assert "http://google.com" not in clean_urls
    assert "[URL]" in clean_urls
    
    # Signature truncation test
    clean_signature = EmailPreprocessor.remove_signature("Task details.\nBest regards,\nDavid")
    assert "David" not in clean_signature
    assert "Best regards" not in clean_signature
    assert "Task details." in clean_signature

# Test Heuristic Classifier Agent
def test_classifier():
    classifier = ClassifierAgent()
    
    # Force heuristic mode for testing stability
    classifier.mode = "FALLBACK"
    
    meeting_email = "Let's schedule a Zoom sync and review calendar invites for tomorrow."
    hr_email = "Employees must submit benefits sign-off forms in HR portal."
    spam_email = "CHEAP LOANS! 100% approval in 5 mins click here!"
    
    assert classifier.classify(meeting_email)["category"] == "Meeting"
    assert classifier.classify(hr_email)["category"] == "HR"
    assert classifier.classify(spam_email)["category"] == "Spam"

# Test Heuristic Priority Agent
def test_priority_detector():
    priority_detector = PriorityAgent()
    priority_detector.mode = "FALLBACK"
    
    urgent_text = "This is an emergency deadline. Urgent actions critical asap!"
    normal_text = "Here is the monthly draft review. We can talk about it next week."
    
    res_urgent = priority_detector.detect_priority(urgent_text)
    res_normal = priority_detector.detect_priority(normal_text)
    
    assert res_urgent["priority"] in ["High", "Medium"]
    assert res_urgent["priority_score"] >= 0.5
    
    assert res_normal["priority"] in ["Medium", "Low"]
    assert res_normal["priority_score"] < 0.5

# Test Task Extractor Agent Heuristics
def test_task_extractor():
    extractor = TaskExtractorAgent()
    extractor.mode = "FALLBACK"
    
    email_content = "Hi David, please verify the API connections before Friday and Alice will compile the release notes tomorrow."
    tasks = extractor.extract_tasks(email_content)
    
    assert len(tasks) >= 1
    # Check if we parsed task subjects and deadlines
    task_names = [t["task"].lower() for t in tasks]
    assert any("verify the api connections" in name for name in task_names) or any("api connections" in name for name in task_names)

# Test Summarizer Agent
def test_summarizer():
    summarizer = SummarizerAgent()
    summarizer.mode = "FALLBACK"
    
    verbose_text = (
        "Hello Board Members. The draft for the Q2 Finance Audit Report is attached below for your consideration. "
        "We have reviewed the budget allocation spreadsheet and want to finalize the documents for the auditors. "
        "Please send your feedback and final approvals by Wednesday at 5:00 PM so we can submit the report."
    )
    
    summary = summarizer.summarize(verbose_text)
    assert len(summary) < len(verbose_text)
    # The summary should extract high-value sentences
    assert "Wednesday" in summary or "approvals" in summary or "Q2" in summary

# Test Sentiment & Auto Reply Agents
def test_sentiment_and_draft():
    sentiment_detector = SentimentAgent()
    drafter = DraftGeneratorAgent()
    
    happy_text = "Thanks a lot! The database migration was successful, great work team!"
    sad_text = "Unfortunately, we missed the client demo because of critical server errors."
    
    res_happy = sentiment_detector.detect_sentiment(happy_text)
    res_sad = sentiment_detector.detect_sentiment(sad_text)
    
    assert res_happy["sentiment"] == "Positive"
    assert res_sad["sentiment"] == "Negative"
    
    draft = drafter.generate_draft(
        sender_name="Sarah Jenkins",
        subject="Migration status",
        category="Work",
        sentiment=res_happy["sentiment"],
        tasks=[]
    )
    
    assert "Sarah" in draft
    assert "great work" in draft.lower() or "hearing from you" in draft.lower()
