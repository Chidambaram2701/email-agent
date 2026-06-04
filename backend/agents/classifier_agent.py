import re
import logging
from typing import Dict, Any
from backend.utils.config import settings

logger = logging.getLogger(__name__)

# Categories list
CATEGORIES = ["Work", "Meeting", "HR", "Finance", "Personal", "Spam"]

# Heuristic keyword dictionary
KEYWORD_MAPPING = {
    "Meeting": [
        r'\bmeet(ing)?\b', r'\bsync\b', r'\bcalendar\b', r'\bschedule\b', 
        r'\binvite\b', r'\bzoom\b', r'\bteams\b', r'\bcall\b', r'\bappointment\b'
    ],
    "HR": [
        r'\bhr\b', r'\bhuman\s+resources\b', r'\bbenefits\b', r'\bpolicy\b', 
        r'\bhandbook\b', r'\bpayroll\b', r'\bhiring\b', r'\bemployee\b', 
        r'\bvacation\b', r'\bleave\b', r'\bcareers?\b'
    ],
    "Finance": [
        r'\bfinance\b', r'\binvoice\b', r'\bbilling\b', r'\baudit\b', 
        r'\bbudget\b', r'\bpayment\b', r'\breceipt\b', r'\bexpense\b', 
        r'\baccounts?\b', r'\bwire\b', r'\btransaction\b'
    ],
    "Spam": [
        r'\bcheap\b', r'\boffer\b', r'\bloans?\b', r'\bcash\b', r'\bwinner?\b', 
        r'\bprizes?\b', r'\bsurveys?\b', r'click\s+here', r'apply\s+now', 
        r'\bweight\s+loss\b', r'\bviagra\b', r'\bunsubscribe\b', r'\bfree\s+trial\b',
        r'\bselected\s+for\b', r'low-interest'
    ],
    "Personal": [
        r'\bcoffee\b', r'\bweekend\b', r'\bplans\b', r'\bdinner\b', 
        r'\bchat\b', r'\bhey\b', r'\bcasual\b', r'\bparty\b', r'\bfriend\b',
        r'\bcatch-up\b'
    ],
    "Work": [
        r'\bprojects?\b', r'\btasks?\b', r'\bmilestone\b', r'\bjira\b', 
        r'\bgit\b', r'\bcode\b', r'\brelease\b', r'\bdeployment\b', 
        r'\breports?\b', r'\bfeedback\b', r'\bclients?\b', r'\bcustomer\b',
        r'\bmeeting\s+notes\b', r'\baction\s+items\b'
    ]
}

class ClassifierAgent:
    """Classifies email content into predefined business domains."""
    
    def __init__(self):
        self.mode = settings.AI_MODE.upper()
        self.pipeline = None

    def classify(self, text: str) -> Dict[str, Any]:
        """Classifies text and returns category and confidence score."""
        if not text:
            return {"category": "Work", "confidence": 1.0}

        if self.mode == "PRODUCTION":
            if self.pipeline is None:
                try:
                    from backend.agents.model_loader import get_pipeline
                    logger.info("Classifier Agent: Loading facebook/bart-large-mnli classification model...")
                    self.pipeline = get_pipeline(
                        "zero-shot-classification", 
                        model="facebook/bart-large-mnli",
                        device=-1 # CPU
                    )
                    logger.info("Classifier Agent: Model loaded successfully.")
                except Exception as e:
                    logger.error(f"Classifier Agent: Failed to load HF model: {e}. Falling back to heuristics.")
                    self.mode = "FALLBACK"

            if self.pipeline:
                try:
                    # Truncate text to avoid model context overflow
                    truncated_text = text[:1500]
                    result = self.pipeline(truncated_text, candidate_labels=CATEGORIES)
                    return {
                        "category": result["labels"][0],
                        "confidence": round(result["scores"][0], 2)
                    }
                except Exception as e:
                    logger.error(f"Classifier Agent model inference failed: {e}. Using heuristics.")
                    return self._classify_heuristics(text)
            else:
                return self._classify_heuristics(text)
        else:
            return self._classify_heuristics(text)

    def _classify_heuristics(self, text: str) -> Dict[str, Any]:
        """Rule-based text categorization fallback."""
        scores = {cat: 0 for cat in CATEGORIES}
        
        # Calculate frequency of matches for each category
        for cat, patterns in KEYWORD_MAPPING.items():
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                scores[cat] += len(matches)

        # Find the category with maximum score
        max_score = -1
        best_category = "Work" # Default
        
        for cat, score in scores.items():
            if score > max_score:
                max_score = score
                best_category = cat
                
        # Calculate a pseudo-confidence score
        total_scores = sum(scores.values())
        if total_scores == 0:
            # No keywords matched; default to 'Work' unless standard indicators
            confidence = 0.50
            best_category = "Work"
        else:
            confidence = round(max_score / total_scores, 2)
            # Ensure confidence is within reasonable bounds
            confidence = max(0.50, min(0.98, confidence))
            
        return {
            "category": best_category,
            "confidence": confidence
        }
