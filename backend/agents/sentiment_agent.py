import re
import logging
from typing import Dict, Any
from backend.utils.config import settings

logger = logging.getLogger(__name__)

# Heuristic sentiment keyword lists
POSITIVE_WORDS = [
    r'\bgood\b', r'\bgreat\b', r'\bawesome\b', r'\bthanks?\b', r'\bappreciat(e|ed|ion)\b', 
    r'\bhappy\b', r'\bpleased\b', r'\bexcellent\b', r'\bsuccess(ful)?\b', r'\bsolved?\b', 
    r'\bagre(e|ed)\b', r'\bcongrat(s|ulations)?\b', r'\bwonderful\b', r'\bperfect\b',
    r'\bglad\b', r'\bhelp(ful)?\b', r'\bprogress\b', r'\blooking\s+forward\b'
]

NEGATIVE_WORDS = [
    r'\bbad\b', r'\bcritical\b', r'\bdelays?\b', r'\berrors?\b', r'\bfail(ure|ed)?\b', 
    r'\bissues?\b', r'\bproblems?\b', r'\bbroken\b', r'\bmissed\b', r'\bdisappointed\b', 
    r'\bwrong\b', r'\bunhappy\b', r'\bsorry\b', r'\bregret\b', r'\brisks?\b', 
    r'\bdanger\b', r'\bconcerns?\b', r'\bcomplaints?\b', r'\bunfortunately\b',
    r'\bdispute\b', r'\bthreat\b', r'\bfrustrated\b'
]

class SentimentAgent:
    """Detects sentiment labels and polarity score from email body text."""
    
    def detect_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Determines sentiment class (Positive, Neutral, Negative) and score.
        Score ranges from -1.0 (Highly Negative) to +1.0 (Highly Positive).
        """
        if not text:
            return {"sentiment": "Neutral", "sentiment_score": 0.0}

        pos_count = 0
        neg_count = 0

        # Count positive terms
        for pattern in POSITIVE_WORDS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            pos_count += len(matches)

        # Count negative terms
        for pattern in NEGATIVE_WORDS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            neg_count += len(matches)

        total_words = len(text.split())
        if total_words == 0:
            return {"sentiment": "Neutral", "sentiment_score": 0.0}

        # Calculate score base on positive vs negative count normalized by active words
        diff = pos_count - neg_count
        denominator = max(1, pos_count + neg_count)
        
        # Base ratio of sentiment words relative to total words
        ratio = denominator / min(100, total_words)
        
        # Calculate raw score in range [-1.0, 1.0]
        score = (diff / denominator) * ratio
        score = round(max(-1.0, min(1.0, score)), 2)

        # Label thresholds
        sentiment = "Neutral"
        if score >= 0.10:
            sentiment = "Positive"
        elif score <= -0.10:
            sentiment = "Negative"

        return {
            "sentiment": sentiment,
            "sentiment_score": score
        }
